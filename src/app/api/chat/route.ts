import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import type { ChatMessage } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are Linemates AI — the intelligence layer of a professional hockey networking platform.

You help users discover their connections in the hockey world: former teammates, paths to people they want to meet, and hidden network links they never knew existed. Think "LinkedIn graph search" but for pro hockey careers.

You have access to a hockey database via tools. When a user asks about connections, players, or career paths, use the tools to fetch real data before answering. Always cite specific teams and seasons when describing connections.

Keep responses concise and conversational. When you find a connection path, present it as a clear chain:
"You → [played with] → Player A [Team, Season] → [played with] → Player B [Team, Season] → ... → Target"

If no path is found within 4 degrees, say so honestly and suggest alternative angles to explore.`

const tools: Anthropic.Tool[] = [
  {
    name: 'search_players',
    description: 'Search for players by name in the hockey database. Use this to find a player ID before doing path lookups.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Player name to search for' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_connection_path',
    description: 'Find the shortest path of teammate connections between two players (up to 4 degrees of separation). Returns a chain of players and the teams/seasons that connect them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_player_id: { type: 'string', description: 'UUID of the starting player' },
        to_player_id:   { type: 'string', description: 'UUID of the target player' },
        max_depth:      { type: 'number', description: 'Max degrees (default 4)' },
      },
      required: ['from_player_id', 'to_player_id'],
    },
  },
  {
    name: 'get_career_teammates',
    description: "Get all players someone shared a team with across their career. Useful for 'who did I play with who now works in management?' type questions.",
    input_schema: {
      type: 'object' as const,
      properties: {
        player_id: { type: 'string', description: 'UUID of the player' },
      },
      required: ['player_id'],
    },
  },
  {
    name: 'get_player_stints',
    description: 'Get the full career history (teams and seasons) for a player.',
    input_schema: {
      type: 'object' as const,
      properties: {
        player_id: { type: 'string', description: 'UUID of the player' },
      },
      required: ['player_id'],
    },
  },
]

async function runTool(name: string, input: Record<string, unknown>) {
  const supabase = await createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = supabase.rpc.bind(supabase) as (fn: string, args?: any) => any

  if (name === 'search_players') {
    const { data, error } = await rpc('search_players', {
      query: input.query as string,
      result_limit: (input.limit as number) ?? 5,
    })
    if (error) return { error: error.message }
    return { players: data }
  }

  if (name === 'find_connection_path') {
    const { data, error } = await rpc('find_connection_path', {
      from_player_id: input.from_player_id as string,
      to_player_id:   input.to_player_id as string,
      max_depth:      (input.max_depth as number) ?? 4,
    })
    if (error) return { error: error.message }
    return { paths: data }
  }

  if (name === 'get_career_teammates') {
    const { data, error } = await rpc('get_career_teammates', {
      target_player_id: input.player_id as string,
    })
    if (error) return { error: error.message }
    return { teammates: data }
  }

  if (name === 'get_player_stints') {
    const { data, error } = await supabase
      .from('stints')
      .select('season, games, goals, assists, points, teams(name, league, country)')
      .eq('player_id', input.player_id as string)
      .order('season', { ascending: false })
    if (error) return { error: error.message }
    return { stints: data }
  }

  return { error: 'Unknown tool' }
}

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json()

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      let currentMessages = [...anthropicMessages]

      // Agentic loop: keep going until no more tool calls
      while (true) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          tools,
          messages: currentMessages,
        })

        const toolUses = response.content.filter((b) => b.type === 'tool_use')
        const textBlock = response.content.find((b) => b.type === 'text')

        if (toolUses.length > 0) {
          send({ type: 'tool_start', tools: toolUses.map((t) => (t as Anthropic.ToolUseBlock).name) })

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of toolUses) {
            const tb = block as Anthropic.ToolUseBlock
            const result = await runTool(tb.name, tb.input as Record<string, unknown>)
            toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) })
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            { role: 'user',      content: toolResults },
          ]
          continue
        }

        // No more tool calls — stream the final text
        if (textBlock && textBlock.type === 'text') {
          const words = textBlock.text.split(' ')
          for (const word of words) {
            send({ type: 'text', delta: word + ' ' })
            await new Promise((r) => setTimeout(r, 12))
          }
        }

        send({ type: 'done' })
        controller.close()
        break
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
