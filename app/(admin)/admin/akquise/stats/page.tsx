import * as akquiseDomain from '@/lib/domain/akquise'
import { AkquiseTabs } from '../AkquiseTabs'
import { StatsBoard } from './StatsBoard'

export default async function AkquiseStatsPage() {
  const [stats, zielgruppen] = await Promise.all([akquiseDomain.getFunnelStats(), akquiseDomain.getZielgruppenStats()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Akquise
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {stats.total_leads} Leads insgesamt
        </p>
      </div>

      <AkquiseTabs />

      <StatsBoard stats={stats} zielgruppen={zielgruppen} />
    </div>
  )
}
