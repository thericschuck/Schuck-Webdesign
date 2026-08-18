import { STAGE_LABEL } from '../stage-constants'

export interface ChangeLogRow {
  id: string
  field: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

const FIELD_LABEL: Record<string, string> = {
  firmenname: 'Firmenname',
  ansprechpartner: 'Ansprechpartner',
  position: 'Position',
  zielgruppe: 'Zielgruppe',
  stadt: 'Stadt',
  website: 'Website',
  phone: 'Telefon',
  email: 'E-Mail',
  quelle: 'Quelle',
  website_qualitaet: 'Website-Qualität',
  prioritaet: 'Priorität',
  erstkontakt_am: 'Erstkontakt am',
  akquise_ergebnis: 'Akquise-Ergebnis',
  wiedervorlage: 'Wiedervorlage',
  notizen: 'Notizen',
  current_stage: 'Stage',
}

const PRIORITAET_LABEL: Record<string, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }
const AKQUISE_ERGEBNIS_LABEL: Record<string, string> = {
  offen: 'Offen',
  nicht_erreicht: 'Nicht erreicht',
  wiedervorlage: 'Wiedervorlage',
  kein_interesse: 'Kein Interesse',
  qualifiziert: 'Qualifiziert',
}

const VALUE_LABEL: Record<string, Record<string, string>> = {
  prioritaet: PRIORITAET_LABEL,
  akquise_ergebnis: AKQUISE_ERGEBNIS_LABEL,
  current_stage: STAGE_LABEL,
}

function formatValue(field: string, value: string | null): string {
  if (value == null || value === '') return '—'
  return VALUE_LABEL[field]?.[value] ?? value
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ChangeLogList({ entries }: { entries: ChangeLogRow[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        Noch keine protokollierten Änderungen aus dem Sheet-Sync.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto custom-scrollbar">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          <span className="text-gray-300 shrink-0 mt-0.5">•</span>
          <div className="min-w-0">
            <p className="text-gray-800">
              <span className="font-medium">{FIELD_LABEL[entry.field] ?? entry.field}</span>: {formatValue(entry.field, entry.old_value)}{' '}
              <span className="text-gray-400">→</span> {formatValue(entry.field, entry.new_value)}
            </p>
            <p className="text-xs text-gray-400">{fmtDateTime(entry.changed_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
