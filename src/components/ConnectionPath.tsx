import type { ConnectionPath } from '@/lib/types'

export default function ConnectionPathCard({ path }: { path: ConnectionPath }) {
  return (
    <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700/60 text-sm">
      <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-blue-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {path.depth} degree{path.depth !== 1 ? 's' : ''} of separation
      </div>
      <div className="flex flex-col gap-0">
        {path.playerNames.map((name, i) => (
          <div key={i}>
            {/* Player node */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 text-[10px] font-bold">
                  {name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                </span>
              </div>
              <span className="font-medium text-white">{name}</span>
            </div>
            {/* Edge (team + season) */}
            {i < path.teamNames.length && (
              <div className="ml-3.5 border-l border-slate-700 pl-5 py-1.5 my-0.5">
                <span className="text-xs text-slate-500">
                  played with on{' '}
                  <span className="text-slate-400 font-medium">{path.teamNames[i]}</span>
                  {path.seasons[i] && (
                    <span className="text-slate-600"> · {path.seasons[i]}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
