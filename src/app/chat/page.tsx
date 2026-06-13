import ChatInterface from '@/components/ChatInterface'
import Logo from '@/components/Logo'
import Link from 'next/link'

export const metadata = { title: 'Chat · Linemates' }

const SUGGESTED = [
  'How am I connected to Wayne Gretzky?',
  'Who did I play with that now works in NHL management?',
  'Find a path between me and Sidney Crosby',
  'Which teammates played in the KHL?',
  'Who connects me to a current NHL GM?',
]

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800/60 flex flex-col bg-slate-900/50">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Logo size={18} />
          </div>
          <span className="font-semibold text-white tracking-tight">Linemates</span>
        </div>

        {/* New chat button */}
        <div className="px-3 pt-4">
          <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-white text-sm transition-all group">
            <svg className="w-4 h-4 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New conversation
          </button>
        </div>

        {/* Suggested queries */}
        <div className="px-3 pt-5 flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 mb-2">
            Try asking
          </p>
          <div className="space-y-1">
            {SUGGESTED.map(q => (
              <button
                key={q}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800/60">
          <Link href="/" className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            New conversation
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </header>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}
