import type { JarvisTool } from '../tool-types'
import { optionalNumber, optionalString, requireString } from './helpers'
import * as productsDomain from '@/lib/domain/products'

// ── list_articles ───────────────────────────────────────────────────────────

const listArticles: JarvisTool = {
  name: 'list_articles',
  requiresConfirmation: false,
  definition: {
    name: 'list_articles',
    description: 'Listet Artikel aus dem Produktkatalog, optional gefiltert nach Kategorie.',
    input_schema: {
      type: 'object',
      properties: {
        kategorie: {
          type: 'string',
          description:
            "Optionaler Filter, z.B. 'Website Core', 'Website Extra', 'Betrieb', 'Care', 'SEO', 'Telefonbot', 'Add-on'.",
        },
      },
    },
  },
  async execute(args) {
    return productsDomain.listArticles({ kategorie: optionalString(args, 'kategorie') ?? undefined })
  },
}

// ── get_article ─────────────────────────────────────────────────────────────

const getArticle: JarvisTool = {
  name: 'get_article',
  requiresConfirmation: false,
  definition: {
    name: 'get_article',
    description: 'Liefert einen Artikel mit Preisspanne, Pflichtbetrieb-Kopplung und Beschreibung.',
    input_schema: {
      type: 'object',
      properties: {
        art_nr: { type: 'string', description: "Artikelnummer, z.B. 'CP-202'." },
      },
      required: ['art_nr'],
    },
  },
  async execute(args) {
    return productsDomain.getArticle(requireString(args, 'art_nr'))
  },
}

// ── list_packages ───────────────────────────────────────────────────────────

const listPackages: JarvisTool = {
  name: 'list_packages',
  requiresConfirmation: false,
  definition: {
    name: 'list_packages',
    description:
      'Listet alle Pakete mit Zielgruppe, Laufzeit und Preis. Nutze die Zielgruppe-Texte, um nach Branche/Bedarf zu filtern (z.B. "für Handwerker").',
    input_schema: { type: 'object', properties: {} },
  },
  async execute() {
    return productsDomain.listPackages()
  },
}

// ── get_package ─────────────────────────────────────────────────────────────

const getPackage: JarvisTool = {
  name: 'get_package',
  requiresConfirmation: false,
  definition: {
    name: 'get_package',
    description: 'Liefert ein Paket mit vollständiger Positionsliste (Artikel, Menge, Einzel- und Gesamtpreis).',
    input_schema: {
      type: 'object',
      properties: {
        pkt_nr: { type: 'string', description: "Paketnummer, z.B. 'PKT-101'." },
      },
      required: ['pkt_nr'],
    },
  },
  async execute(args) {
    return productsDomain.getPackage(requireString(args, 'pkt_nr'))
  },
}

// ── check_pflichtbetrieb ─────────────────────────────────────────────────────

const checkPflichtbetrieb: JarvisTool = {
  name: 'check_pflichtbetrieb',
  requiresConfirmation: false,
  definition: {
    name: 'check_pflichtbetrieb',
    description:
      'Prüft, welchen laufenden Betriebs-Artikel ein Setup-Artikel zwingend erfordert (z.B. Admin-Bereich EX-02 erzwingt Supabase-Betrieb EX-03-B).',
    input_schema: {
      type: 'object',
      properties: {
        art_nr: { type: 'string', description: "Artikelnummer des Setup-Artikels, z.B. 'EX-02'." },
      },
      required: ['art_nr'],
    },
  },
  async execute(args) {
    return productsDomain.checkPflichtbetrieb(requireString(args, 'art_nr'))
  },
}

// ── update_article_price ─────────────────────────────────────────────────────

const updateArticlePrice: JarvisTool = {
  name: 'update_article_price',
  requiresConfirmation: true,
  definition: {
    name: 'update_article_price',
    description: 'Ändert die Preisspanne (preis_min/preis_max) eines Artikels. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        art_nr: { type: 'string', description: "Artikelnummer, z.B. 'CP-202'." },
        preis_min: { type: 'number', description: 'Neuer Mindestpreis.' },
        preis_max: { type: 'number', description: 'Neuer Höchstpreis (bei Fixpreisen identisch zu preis_min).' },
      },
      required: ['art_nr'],
    },
  },
  async execute(args) {
    return productsDomain.updateArticlePrice(requireString(args, 'art_nr'), {
      preisMin: optionalNumber(args, 'preis_min'),
      preisMax: optionalNumber(args, 'preis_max'),
    })
  },
}

export const productTools: JarvisTool[] = [
  listArticles,
  getArticle,
  listPackages,
  getPackage,
  checkPflichtbetrieb,
  updateArticlePrice,
]
