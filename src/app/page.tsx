import Link from 'next/link'
import Logo from '@/components/Logo'

export default function Home() {
  return (
    <main
      className="min-h-screen bg-black text-white flex flex-col"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Logo size={18} />
          <span className="text-sm font-medium tracking-tight">Linemates</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/chat"
            className="text-sm px-3.5 py-1.5 text-white/40 hover:text-white transition-colors rounded-md hover:bg-white/[0.06]"
          >
            Sign in
          </Link>
          <Link
            href="/chat"
            className="text-sm px-3.5 py-1.5 bg-white text-black rounded-md font-medium hover:bg-white/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-32 text-center">

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.1] text-[11px] text-white/40 mb-10 font-mono uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Hockey network intelligence
        </div>

        <h1
          className="font-semibold tracking-tight leading-[1.06] mb-6 max-w-2xl"
          style={{ fontSize: 'clamp(2.75rem, 6vw, 4.5rem)' }}
        >
          Know the room.
        </h1>

        <p className="text-white/40 leading-relaxed max-w-[400px] mb-10" style={{ fontSize: '1.0625rem' }}>
          Find how you're connected to anyone in pro hockey through the teammates, coaches, and executives you've already crossed paths with.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 transition-colors"
          >
            Start exploring
          </Link>
          <Link
            href="/chat"
            className="px-5 py-2.5 text-sm text-white/35 hover:text-white/70 transition-colors"
          >
            See how it works →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-xl mx-auto grid grid-cols-3 divide-x divide-white/[0.06]">
          {[
            { n: '≤ 4',  label: 'Degrees of separation' },
            { n: '30+',  label: 'Leagues indexed'        },
            { n: '943K', label: 'Players in graph'       },
          ].map(s => (
            <div key={s.label} className="py-7 text-center">
              <div className="text-xl font-semibold tabular-nums">{s.n}</div>
              <div className="text-[11px] text-white/25 mt-1 tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

    </main>
  )
}
