import RankingTable from '@/components/RankingTable'

export default function RankingPage() {
  return (
    <main className="min-h-screen text-slate-100 relative" style={{backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col min-h-screen">
      <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-slate-100 tracking-tight">
          K7 <span className="text-emerald-400">BET</span>
        </span>
        <div className="flex gap-6 text-sm">
          <a href="/jogos" className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Jogos</a>
          <a href="/ranking" className="text-slate-100 font-medium cursor-pointer">Ranking</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-lg font-bold text-slate-100 tracking-tight mb-6">Ranking</h1>
        <RankingTable />
      </div>
      </div>
    </main>
  )
}
