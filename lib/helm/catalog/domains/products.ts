import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as productsDomain from '@/lib/domain/products'

// ── list_articles ───────────────────────────────────────────────────────────

const listArticles = defineTool({
  slug: 'list_articles',
  label: 'Artikel auflisten',
  description: 'Listet Artikel aus dem Produktkatalog, optional gefiltert nach Kategorie.',
  requiresConfirmation: false,
  schema: z.object({
    kategorie: z
      .string()
      .optional()
      .describe("Optionaler Filter, z.B. 'Website Core', 'Website Extra', 'Betrieb', 'Care', 'SEO', 'Telefonbot', 'Add-on'."),
  }),
  async execute(args) {
    return productsDomain.listArticles({ kategorie: args.kategorie })
  },
})

// ── get_article ─────────────────────────────────────────────────────────────

const getArticle = defineTool({
  slug: 'get_article',
  label: 'Artikel abrufen',
  description: 'Liefert einen Artikel mit Preisspanne, Pflichtbetrieb-Kopplung und Beschreibung.',
  requiresConfirmation: false,
  schema: z.object({
    art_nr: z.string().describe("Artikelnummer, z.B. 'CP-202'."),
  }),
  async execute(args) {
    return productsDomain.getArticle(args.art_nr)
  },
})

// ── list_packages ───────────────────────────────────────────────────────────

const listPackages = defineTool({
  slug: 'list_packages',
  label: 'Pakete auflisten',
  description:
    'Listet alle Pakete mit Zielgruppe, Laufzeit und Preis. Nutze die Zielgruppe-Texte, um nach Branche/Bedarf zu filtern (z.B. "für Handwerker").',
  requiresConfirmation: false,
  schema: z.object({}),
  async execute() {
    return productsDomain.listPackages()
  },
})

// ── get_package ─────────────────────────────────────────────────────────────

const getPackage = defineTool({
  slug: 'get_package',
  label: 'Paket abrufen',
  description: 'Liefert ein Paket mit vollständiger Positionsliste (Artikel, Menge, Einzel- und Gesamtpreis).',
  requiresConfirmation: false,
  schema: z.object({
    pkt_nr: z.string().describe("Paketnummer, z.B. 'PKT-101'."),
  }),
  async execute(args) {
    return productsDomain.getPackage(args.pkt_nr)
  },
})

// ── check_pflichtbetrieb ─────────────────────────────────────────────────────

const checkPflichtbetrieb = defineTool({
  slug: 'check_pflichtbetrieb',
  label: 'Pflichtbetrieb prüfen',
  description:
    'Prüft, welchen laufenden Betriebs-Artikel ein Setup-Artikel zwingend erfordert (z.B. Admin-Bereich EX-02 erzwingt Supabase-Betrieb EX-03-B).',
  requiresConfirmation: false,
  schema: z.object({
    art_nr: z.string().describe("Artikelnummer des Setup-Artikels, z.B. 'EX-02'."),
  }),
  async execute(args) {
    return productsDomain.checkPflichtbetrieb(args.art_nr)
  },
})

// ── update_article_price ─────────────────────────────────────────────────────

const updateArticlePrice = defineTool({
  slug: 'update_article_price',
  label: 'Artikelpreis ändern',
  description: 'Ändert die Preisspanne (preis_min/preis_max) eines Artikels. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    art_nr: z.string().describe("Artikelnummer, z.B. 'CP-202'."),
    preis_min: z.number().optional().describe('Neuer Mindestpreis.'),
    preis_max: z.number().optional().describe('Neuer Höchstpreis (bei Fixpreisen identisch zu preis_min).'),
  }),
  summarize: (args) =>
    `Preisspanne von Artikel ${args.art_nr} ändern${
      args.preis_min !== undefined || args.preis_max !== undefined
        ? ` (${args.preis_min ?? '—'} – ${args.preis_max ?? '—'} €)`
        : ''
    }.`,
  async execute(args) {
    return productsDomain.updateArticlePrice(args.art_nr, {
      preisMin: args.preis_min ?? null,
      preisMax: args.preis_max ?? null,
    })
  },
})

export const productTools: HelmToolDef[] = [
  listArticles,
  getArticle,
  listPackages,
  getPackage,
  checkPflichtbetrieb,
  updateArticlePrice,
]
