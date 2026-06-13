import ChatInterface from '@/components/ChatInterface'
import Logo from '@/components/Logo'
import Link from 'next/link'

export const metadata = { title: 'Linemates' }

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-[#07101f] overflow-hidden">

      {/* Icon-only sidebar */}
      <aside className="w-14 flex-shrink-0 border-r border-white/[0.07] flex flex-col items-center pt-4 pb-4">

        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
        >
          <Logo size={20} />
        </Link>

        <div className="flex-1" />

        {/* History */}
        <button className="w-9 h-9 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors rounded-lg hover:bg-white/[0.06] mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* New conversation */}
        <button className="w-9 h-9 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors rounded-lg hover:bg-white/[0.06]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.07] flex-shrink-0">
          <span className="text-[13px] text-white/30 font-mono">New conversation</span>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-500/80 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            live
          </span>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}
