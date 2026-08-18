import type { Article } from '@/types/database'

export type ArticleRow = Pick<
  Article,
  'art_nr' | 'bezeichnung' | 'preis_min' | 'preis_max' | 'einheit' | 'typ' | 'kategorie' | 'pflichtbetrieb_art_nr' | 'aktiv'
>
