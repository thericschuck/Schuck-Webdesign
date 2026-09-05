import { createAdminClient } from '@/lib/supabase/admin'
import * as projectsDomain from '@/lib/domain/projects'
import * as productsDomain from '@/lib/domain/products'
import * as financeDomain from '@/lib/domain/finance'
import { clientDisplayName } from '@/lib/client-name'
import type { ClientOption, ProjectOption } from '@/components/documents/DocumentEditor'
import type { ArticleOption, PackageOption } from '@/components/documents/PositionsEditor'
import type { CompanySettings } from '@/types/database'

/**
 * Lädt alles, was der Dokument-Editor an Auswahllisten braucht.
 *
 * Gemeinsam für Rechnung und Angebot, neu und Bearbeiten — vier Seiten mit
 * derselben Ladelogik. Die Kundenliste enthält bewusst die vollständige
 * Anschrift: die Live-Vorschau rendert den Empfängerblock im Browser und käme
 * sonst nicht an Straße und Ort heran.
 */
export interface EditorData {
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
  companySettings: CompanySettings
}

export async function ladeEditorDaten(): Promise<EditorData> {
  const adminClient = createAdminClient()

  const [{ data: clientsRaw }, projects, articles, packages, companySettings] = await Promise.all([
    adminClient
      .from('clients')
      .select(
        'id, company_name, contact_name, client_number, address_street, address_zip, address_city, address_country, profiles(full_name)'
      ),
    projectsDomain.listProjects(),
    productsDomain.listArticles().catch(() => []),
    productsDomain.listPackages().catch(() => []),
    financeDomain.getCompanySettings(),
  ])

  const clients: ClientOption[] = (clientsRaw ?? [])
    .map((c) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      return {
        id: c.id,
        display_name: clientDisplayName(profile?.full_name, c.contact_name, c.company_name),
        client_number: c.client_number,
        company_name: c.company_name,
        contact_name: c.contact_name,
        full_name: profile?.full_name ?? null,
        address_street: c.address_street,
        address_zip: c.address_zip,
        address_city: c.address_city,
        address_country: c.address_country,
      }
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name, 'de'))

  return {
    clients,
    projects: projects.map((p) => ({ id: p.id, title: p.title, client_id: p.client_id })),
    articles: (articles ?? []).map((a) => ({
      art_nr: a.art_nr,
      bezeichnung: a.bezeichnung,
      preis_min: a.preis_min,
      preis_max: a.preis_max,
    })),
    packages: (packages ?? []).map((p) => ({
      pkt_nr: p.pkt_nr,
      paketname: p.paketname,
      paketpreis: p.paketpreis,
    })),
    companySettings,
  }
}
