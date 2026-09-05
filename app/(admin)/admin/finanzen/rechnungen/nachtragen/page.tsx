import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import * as projectsDomain from '@/lib/domain/projects'
import * as productsDomain from '@/lib/domain/products'
import * as financeDomain from '@/lib/domain/finance'
import { NachtragenForm } from './NachtragenForm'
import { clientDisplayName } from '@/lib/client-name'

export default async function NachtragenPage() {
  const supabase = await createClient()

  const [{ data: clientsRaw }, projects, articles, packages, companySettings] = await Promise.all([
    supabase.from('clients').select('id, company_name, contact_name, client_number, profiles(full_name)'),
    projectsDomain.listProjects(),
    productsDomain.listArticles().catch(() => []),
    productsDomain.listPackages().catch(() => []),
    financeDomain.getCompanySettings(),
  ])

  const sortedClients = (clientsRaw ?? [])
    .map((c) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      return { id: c.id, client_number: c.client_number, display_name: clientDisplayName(profile?.full_name, c.contact_name, c.company_name) }
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen/belege" className="hover:text-gray-600 transition-colors">
          Belege
        </Link>
        <span>/</span>
        <span className="text-gray-700">Rechnung nachtragen</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Rechnung nachtragen
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Für bereits gestellte Rechnungen aus der Zeit vor diesem System — mit ihrer ursprünglichen Nummer.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-3xl">
        <NachtragenForm
          clients={sortedClients}
          projects={projects.map((p) => ({ id: p.id, client_id: p.client_id, title: p.title, project_number: p.project_number }))}
          articles={(articles ?? []).map((a) => ({
            art_nr: a.art_nr,
            bezeichnung: a.bezeichnung,
            preis_min: a.preis_min,
            preis_max: a.preis_max,
          }))}
          packages={(packages ?? []).map((p) => ({
            pkt_nr: p.pkt_nr,
            paketname: p.paketname,
            paketpreis: p.paketpreis,
          }))}
          defaultUstPflichtig={companySettings.ust_pflichtig}
        />
      </div>
    </div>
  )
}
