import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          AI-powered hockey networking
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Discover your hockey<br />
          <span className="text-blue-400">network</span>
        </h1>

        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Find connection paths to anyone in professional hockey. Uncover the former teammates, coaches, and executives that link you to the people you want to meet.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/chat"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Start exploring →
          </Link>
          <a
            href="#"
            className="px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-colors"
          >
            How it works
          </a>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-8 text-left">
          {[
            { label: 'Degrees of separation', value: '≤ 4', desc: 'From you to anyone in pro hockey' },
            { label: 'Career stints indexed', value: '∞', desc: 'Every team, every season' },
            { label: 'Ask anything', value: 'AI', desc: 'Natural language graph queries' },
          ].map((stat) => (
            <div key={stat.label} className="border border-slate-800 rounded-xl p-5 bg-slate-900/50">
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-slate-300 mb-1">{stat.label}</div>
              <div className="text-xs text-slate-500">{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
