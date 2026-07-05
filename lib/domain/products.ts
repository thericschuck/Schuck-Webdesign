import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'
import type { Article, Database } from '@/types/database'

type ArticleUpdate = Database['public']['Tables']['articles']['Update']

export interface ListArticlesFilter {
  kategorie?: string
}

export async function listArticles(filter: ListArticlesFilter = {}) {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('articles')
    .select('art_nr, bezeichnung, beschreibung, preis_min, preis_max, einheit, typ, kategorie, pflichtbetrieb_art_nr, aktiv')
    .eq('aktiv', true)
    .order('art_nr', { ascending: true })

  if (filter.kategorie) query = query.eq('kategorie', filter.kategorie)

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
