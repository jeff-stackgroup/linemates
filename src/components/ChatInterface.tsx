'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, ConnectionPath } from '@/lib/types'
import ConnectionPathCard from './ConnectionPath'
import Logo from './Logo'

const STARTERS = [
  { icon: '🔗', text: 'How am I connected to Wayne Gretzky?' },
  { icon: '🏒', text: 'Who did I play with that now works in NHL management?' },
  { icon: '🛤️', text: 'Find the shortest path between me and Sidney Crosby' },
  { icon: '🌍', text: 'Which of my former teammates played in the KHL?' },
]

// Pull any connection paths out of the assistant message text
function extractPaths(text: string): ConnectionPath[] {
  // Paths are injected as JSON blocks in the message metadata
  // For now return empty — the API will add them to metadata when implemented
  return []
}

function ToolBadge({ name }: { name: string }) {
  const labels: Record<string, string> = {
    search_players:       'Searching players…',
    find_connection_path: 'Finding path…',
    get_career_teammates: 'Loading teammates…',
    get_player_stints:    'Loading career…',
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-blue-400/80">
      <div className="w-3 h-3 border border-blue-400/60 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      {labels[name] ?? `Running ${name}…`}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const paths  = msg.metadata?.paths ?? []

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-blue-600/30">
          <Logo size={18} />
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm shadow-lg shadow-blue-600/20'
              : 'bg-slate-800/80 text-slate-100 rounded-bl-sm border border-slate-700/50'
          }`}
        >
          {msg.content || (
            <span className="flex gap-1 items-center h-4">
              {[0, 150, 300].map(d => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </span>
          )}
        </div>
        {paths.map((p, i) => <ConnectionPathCard key={i} path={p} />)}
      </div>
    </div>
  )
}

export default function ChatInterface() {
  const [messages, setMessages]         = useState<ChatMessage[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [toolsRunning, setToolsRunning] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolsRunning])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    setToolsRunning([])

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    setMessages([...next, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))

          if (event.type === 'tool_start') {
            setToolsRunning(event.tools)
          } else if (event.type === 'text') {
            accumulated += event.delta
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: accumulated }
              return updated
            })
          } else if (event.type === 'done') {
            setToolsRunning([])
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Something went wrong — please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
      setToolsRunning([])
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center max-w-lg mx-auto">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30">
                <Logo size={30} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Who do you know?</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ask me to find connection paths, surface former teammates, or discover hidden links in your hockey network.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {STARTERS.map(s => (
                <button
                  key={s.text}
                  onClick={() => send(s.text)}
                  className="text-left px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-700/50 hover:border-blue-500/40 transition-all text-sm text-slate-300 hover:text-white group"
                >
                  <span className="mr-2 group-hover:scale-110 inline-block transition-transform">{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}

        {toolsRunning.length > 0 && (
          <div className="flex flex-col gap-1.5 pl-11">
            {toolsRunning.map(t => <ToolBadge key={t} name={t} />)}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about connections, former teammates, paths to anyone in hockey…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-slate-800/60 border border-slate-700/60 focus:border-blue-500/70 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50 min-h-[46px] max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-blue-600/20 flex-shrink-0"
          >
            <svg className="w-4 h-4 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-slate-700 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
