import Link from 'next/link'
import NetworkGraph from '@/components/NetworkGraph'
import Logo from '@/components/Logo'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-slate-950 overflow-hidden flex flex-col">

      {/* Animated network background */}
      <NetworkGraph />

      {/* Radial gradient overlay so text stays readable */}
      <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-slate-950/0 via-slate-950/60 to-slate-950 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="font-semibold text-white tracking-tight">Linemates</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/chat" className="text-sm text-slate-400 hover:text-white transition-colors">Chat</Link>
          <Link
            href="/chat"
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Open app →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          AI-powered hockey networking · private beta
        </div>

        <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight max-w-3xl">
          Six degrees of{' '}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">
            hockey
          </span>
        </h1>

        <p className="text-slate-400 text-xl mb-10 leading-relaxed max-w-xl">
          Find connection paths to anyone in professional hockey through your network of former teammates, coaches, and executives.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link
            href="/chat"
            className="px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all hover:scale-105 shadow-lg shadow-blue-600/25"
          >
            Explore your network →
          </Link>
          <a
            href="#how"
            className="px-7 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium text-base transition-colors"
          >
            How it works
          </a>
        </div>

        {/* Floating example query */}
        <div className="mt-16 px-5 py-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 backdrop-blur-sm text-sm text-slate-300 max-w-sm">
          <span className="text-slate-500 mr-2">Try asking:</span>
          "How am I connected to Sidney Crosby?"
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 border-t border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-slate-800/60 text-center">
          {[
            { n: '≤ 4', label: 'Degrees of separation', sub: 'You to anyone in pro hockey' },
            { n: '30+', label: 'Leagues indexed',       sub: 'NHL, KHL, SHL, AHL and more' },
            { n: 'AI',  label: 'Ask in plain English',  sub: 'No search syntax needed'   },
          ].map(s => (
            <div key={s.n} className="px-6">
              <div className="text-2xl font-bold text-white">{s.n}</div>
              <div className="text-xs font-medium text-slate-300 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-600 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
