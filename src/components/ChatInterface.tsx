'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, ConnectionPath } from '@/lib/types'
import ConnectionPathCard from './ConnectionPath'

const STARTERS = [
  {
    text: 'How am I connected to Wayne Gretzky?',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    text: 'Who did I play with that now works in NHL management?',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9" />
      </svg>
    ),
  },
  {
    text: 'Find the shortest path between me and Sidney Crosby',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    text: 'Which of my former teammates played in the KHL?',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
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
          <div className="h-full flex flex-col justify-center max-w-[600px]">
            {/* Greeting */}
            <div className="mb-8">
              <h2
                className="font-display font-extrabold uppercase leading-none text-white"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
              >
                Hi there, <span className="text-amber-400">Jeff.</span>
              </h2>
              <p className="text-white/30 text-sm mt-2 font-mono">Who are you looking for?</p>
            </div>

            {/* Prompt cards — 2×2 grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {STARTERS.map(s => (
                <button
                  key={s.text}
                  onClick={() => send(s.text)}
                  className="flex flex-col justify-between p-4 border border-white/[0.08]
                             hover:border-white/[0.18] hover:bg-white/[0.04]
                             rounded-lg text-left transition-all group min-h-[100px]"
                >
                  <p className="text-[13px] text-white/50 group-hover:text-white/80 leading-snug transition-colors">
                    {s.text}
                  </p>
                  <div className="mt-3 text-white/20 group-hover:text-white/50 transition-colors">
                    {s.icon}
                  </div>
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
      <div className="flex-shrink-0 px-8 py-5 border-t border-white/[0.07]">
        <div className="flex items-end gap-3 max-w-[600px]">
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
