import ChatInterface from '@/components/ChatInterface'
import Logo from '@/components/Logo'
import Link from 'next/link'

export const metadata = { title: 'Linemates' }

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-[#07101f] overflow-hidden">

      {/* Narrow sidebar — feels like a scouting binder spine, not ChatGPT */}
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.07] flex flex-col">

        <Link href="/" className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.07] group">
          <Logo size={20} />
          <span className="font-display font-700 uppercase text-white text-sm tracking-wider">Linemates</span>
        </Link>

        {/* Session list — placeholder, real sessions once auth is wired */}
        <div className="flex-1 py-3 overflow-y-auto">
          <p className="px-4 py-1.5 text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em]">
            Recent
          </p>
          {[
            'Crosby path search',
            'Former AHL teammates',
            'KHL connections',
          ].map(s => (
            <button
              key={s}
              className="w-full text-left px-4 py-2 text-[13px] text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-colors truncate"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-white/[0.07]">
          <button className="w-full text-left text-[12px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            New conversation
          </button>
        </div>
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
