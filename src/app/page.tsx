import Link from 'next/link'
import RinkBackground from '@/components/RinkBackground'
import Logo from '@/components/Logo'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#07101f] overflow-hidden flex flex-col">

      {/* Rink — fills the whole background, very subtle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <RinkBackground className="w-full h-full text-white/[0.04] max-w-5xl" />
      </div>

      {/* Vignette so edges fade to background */}
      <div className="absolute inset-0 bg-radial-[ellipse_80%_60%_at_50%_50%] from-transparent to-[#07101f]/90 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center">
            <Logo size={24} />
          </div>
          <span className="text-white font-semibold tracking-tight text-sm uppercase">Linemates</span>
        </div>
        <Link
          href="/chat"
          className="text-sm px-4 py-2 bg-white text-[#07101f] font-semibold rounded tracking-tight hover:bg-white/90 transition-colors"
        >
          Open app →
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">

        <p className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          Hockey network intelligence
        </p>

        <h1
          className="font-display font-800 uppercase text-white leading-none tracking-tight mb-6"
          style={{ fontSize: 'clamp(4rem, 12vw, 9rem)', letterSpacing: '-0.02em' }}
        >
          Know the<br />
          <span className="text-blue-400">room.</span>
        </h1>

        <p className="text-white/50 text-lg mb-10 max-w-md leading-relaxed">
          Find the path from you to anyone in pro hockey through teammates, coaches, and executives you've already crossed paths with.
        </p>

        <Link
          href="/chat"
          className="px-8 py-3.5 bg-white text-[#07101f] font-bold text-sm tracking-wide uppercase rounded hover:bg-white/90 transition-colors"
        >
          Find your network
        </Link>
      </div>

      {/* Bottom bar — scoreboard style */}
      <div className="relative z-10 border-t border-white/[0.08]">
        <div className="max-w-2xl mx-auto grid grid-cols-3 divide-x divide-white/[0.08]">
          {[
            { n: '≤ 4',  label: 'Degrees of separation' },
            { n: '30+',  label: 'Leagues indexed'       },
            { n: '943K', label: 'Players in the graph'  },
          ].map(s => (
            <div key={s.label} className="py-5 px-6 text-center">
              <div
                className="font-display font-800 uppercase text-white"
                style={{ fontSize: '1.75rem', letterSpacing: '-0.01em' }}
              >
                {s.n}
              </div>
              <div className="text-[11px] text-white/30 uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
