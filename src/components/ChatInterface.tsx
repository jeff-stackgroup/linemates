'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, ConnectionPath } from '@/lib/types'
import ConnectionPathCard from './ConnectionPath'

const STARTERS = [
  'How am I connected to Wayne Gretzky?',
  'Who did I play with that now works in NHL management?',
  'Find the shortest path between me and Sidney Crosby',
  'Which of my former teammates played in the KHL?',
]

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const paths  = (msg.metadata?.paths ?? []) as ConnectionPath[]

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-5 h-5 rounded-sm bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-[9px] font-bold text-blue-400 font-mono">AI</span>
        </div>
      )}
      <div className={`max-w-[80%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 text-[14px] leading-relaxed ${
            isUser
              ? 'bg-white text-[#07101f] font-medium rounded-lg rounded-br-sm'
              : 'bg-white/[0.05] border border-white/[0.08] text-white/80 rounded-lg rounded-bl-sm'
          }`}
        >
          {msg.content || (
            <span className="flex gap-1 items-center h-4">
              {[0, 120, 240].map(d => (
                <span
                  key={d}
                  className="w-1 h-1 rounded-full bg-white/30 animate-bounce"
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
    setMessages([...next, { role: 'assistant', content: '' }])

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
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))
          if (event.type === 'tool_start') setToolsRunning(event.tools)
          else if (event.type === 'text') {
            accumulated += event.delta
            setMessages(prev => {
              const u = [...prev]
              u[u.length - 1] = { role: 'assistant', content: accumulated }
              return u
            })
          } else if (event.type === 'done') setToolsRunning([])
        }
      }
    } catch {
      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: 'Something went wrong — please try again.' }
        return u
      })
    } finally {
      setLoading(false)
      setToolsRunning([])
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-start justify-end pb-4 max-w-2xl">
            <p className="text-[11px] font-mono text-white/20 uppercase tracking-widest mb-3">
              Ask anything
            </p>
            <div className="flex flex-col gap-2 w-full">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-[14px] text-white/40 hover:text-white/80 border-b border-white/[0.06] hover:border-white/20 py-2.5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}

        {toolsRunning.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-blue-400/60 pl-8">
            <div className="w-2.5 h-2.5 border border-blue-400/40 border-t-transparent rounded-full animate-spin" />
            {toolsRunning[0] === 'find_connection_path' ? 'Tracing path…'
              : toolsRunning[0] === 'search_players' ? 'Looking up player…'
              : toolsRunning[0] === 'get_career_teammates' ? 'Loading teammates…'
              : 'Querying…'}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-white/[0.07]">
        <div className="flex items-end gap-3 max-w-2xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
            placeholder="Ask about your network…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent border-b border-white/20 focus:border-white/50 py-2 text-[14px] text-white placeholder-white/20 focus:outline-none transition-colors disabled:opacity-40"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="text-[11px] font-mono text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors pb-2 uppercase tracking-widest"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
