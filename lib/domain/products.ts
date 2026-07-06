import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import type { Article, Database, Package } from '@/types/database'

type ArticleUpdate = Database['public']['Tables']['articles']['Update']

export interface ListArticlesFilter {
  kategorie?: string
  search?: string
  /** true = auch deaktivierte Artikel einschließen; Standard: nur aktive (wie bisher). */
  includeInactive?: boolean
}

export async function listArticles(filter: ListArticlesFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('articles')
    .select('art_nr, bezeichnung, beschreibung, preis_min, preis_max, einheit, typ, kategorie, pflichtbetrieb_art_nr, aktiv')
    .order('art_nr', { ascending: true })

  if (!filter.includeInactive) query = query.eq('aktiv', true)
  if (filter.kategorie) query = query.eq('kategorie', filter.kategorie)
  if (filter.search) query = query.or(`bezeichnung.ilike.%${filter.search}%,art_nr.ilike.%${filter.search}%`)

  const { data, error } = await query
  if (error) throw new DomainError(error.message)
  return data
}

export async function getArticle(artNr: string): Promise<Article> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('articles').select('*').eq('art_nr', artNr).single()
  if (error) throw new DomainError(`Artikel "${artNr}" nicht gefunden.`)
  return data
}

export async function listPackages() {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('packages')
    .select('pkt_nr, paketname, paketpreis, zielgruppe, laufzeit, folgeprodukt')
    .order('pkt_nr', { ascending: true })

  if (error) throw new DomainError(error.message)
  return data
}

export async function getPackage(pktNr: string) {
  const adminClient = createAdminClient()

  const [{ data: pkg, error: pkgError }, { data: items, error: itemsError }] = await Promise.all([
    adminClient.from('packages').select('*').eq('pkt_nr', pktNr).single(),
    adminClient
      .from('package_items')
      .select('art_nr, pos, menge, ep, gesamt, articles(bezeichnung)')
      .eq('pkt_nr', pktNr)
      .order('pos', { ascending: true }),
  ])

  if (pkgError) throw new DomainError(`Paket "${pktNr}" nicht gefunden.`)
  if (itemsError) throw new DomainError(itemsError.message)

  return { ...pkg, items: items ?? [] }
}

export interface PflichtbetriebResult {
  art_nr: string
  pflichtbetrieb: { art_nr: string; bezeichnung: string; preis_min: number | null; preis_max: number | null; einheit: string | null } | null
  message?: string
}

export async function checkPflichtbetrieb(artNr: string): Promise<PflichtbetriebResult> {
  const adminClient = createAdminClient()

  const { data: article, error } = await adminClient
    .from('articles')
    .select('art_nr, bezeichnung, pflichtbetrieb_art_nr')
    .eq('art_nr', artNr)
    .single()

  if (error) throw new DomainError(`Artikel "${artNr}" nicht gefunden.`)
  if (!article.pflichtbetrieb_art_nr) {
    return { art_nr: artNr, pflichtbetrieb: null, message: `${artNr} erfordert keinen zusätzlichen Betriebs-Artikel.` }
  }

  const { data: betrieb, error: betriebError } = await adminClient
    .from('articles')
    .select('art_nr, bezeichnung, preis_min, preis_max, einheit')
    .eq('art_nr', article.pflichtbetrieb_art_nr)
    .single()

  if (betriebError) throw new DomainError(betriebError.message)
  return { art_nr: artNr, pflichtbetrieb: betrieb }
}

export interface ListPackagesForArticleResult {
  pkt_nr: string
  paketname: string
  paketpreis: number | null
}

export async function listPackagesForArticle(artNr: string): Promise<ListPackagesForArticleResult[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('package_items')
    .select('packages(pkt_nr, paketname, paketpreis)')
    .eq('art_nr', artNr)

  if (error) throw new DomainError(error.message)

  return (data ?? [])
    .map((row) => (Array.isArray(row.packages) ? row.packages[0] : row.packages))
    .filter((pkg): pkg is ListPackagesForArticleResult => pkg != null)
}

export interface PackageWithSavings extends Package {
  einzelpreise_summe: number | null
  ersparnis: number | null
}

export async function listPackagesWithSavings(): Promise<PackageWithSavings[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('packages')
    .select('pkt_nr, paketname, paketpreis, zielgruppe, laufzeit, folgeprodukt, created_at, updated_at, package_items(ep, menge, gesamt)')
    .order('pkt_nr', { ascending: true })

  if (error) throw new DomainError(error.message)

  return (data ?? []).map(({ package_items, ...pkg }) => {
    const items = Array.isArray(package_items) ? package_items : []
    const hasPriceData = items.some((i) => i.gesamt != null || i.ep != null)
    const summe = hasPriceData
      ? items.reduce((sum, i) => sum + (i.gesamt ?? (i.ep ?? 0) * (i.menge ?? 1)), 0)
      : null

    return {
      ...pkg,
      einzelpreise_summe: summe,
      ersparnis: summe != null && pkg.paketpreis != null ? summe - pkg.paketpreis : null,
    }
  })
}

export interface UpdateArticleInput {
  bezeichnung?: string
  beschreibung?: string | null
  preisMin?: number | null
  preisMax?: number | null
  einheit?: string | null
  typ?: string | null
  kategorie?: string | null
  pflichtbetriebArtNr?: string | null
  aktiv?: boolean
}

export async function updateArticle(artNr: string, patch: UpdateArticleInput): Promise<Article> {
  const updates: ArticleUpdate = {}
  if (patch.bezeichnung !== undefined) updates.bezeichnung = patch.bezeichnung
  if (patch.beschreibung !== undefined) updates.beschreibung = patch.beschreibung
  if (patch.preisMin !== undefined) updates.preis_min = patch.preisMin
  if (patch.preisMax !== undefined) updates.preis_max = patch.preisMax
  if (patch.einheit !== undefined) updates.einheit = patch.einheit
  if (patch.typ !== undefined) updates.typ = patch.typ
  if (patch.kategorie !== undefined) updates.kategorie = patch.kategorie
  if (patch.pflichtbetriebArtNr !== undefined) updates.pflichtbetrieb_art_nr = patch.pflichtbetriebArtNr
  if (patch.aktiv !== undefined) updates.aktiv = patch.aktiv

  if (Object.keys(updates).length === 0) throw new DomainError('Keine Änderungen übergeben.')
  if (updates.pflichtbetrieb_art_nr === artNr) {
    throw new DomainError('Ein Artikel kann nicht sein eigener Pflichtbetrieb-Artikel sein.')
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('articles')
    .update(updates)
    .eq('art_nr', artNr)
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)
  return data
}

export interface UpdateArticlePriceInput {
  preisMin?: number | null
  preisMax?: number | null
}

export async function updateArticlePrice(artNr: string, patch: UpdateArticlePriceInput): Promise<Article> {
  if (patch.preisMin == null && patch.preisMax == null) {
    throw new DomainError('Weder preis_min noch preis_max angegeben.')
  }

  const updates: Record<string, number> = {}
  if (patch.preisMin != null) updates.preis_min = patch.preisMin
  if (patch.preisMax != null) updates.preis_max = patch.preisMax

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('articles')
    .update(updates as ArticleUpdate)
    .eq('art_nr', artNr)
    .select('*')
    .single()

  if (error) throw new DomainError(error.message)
  return data
}
