import { redirect } from 'next/navigation'

/** Rechnungen und Angebote liegen seit dem Umbau in einer gemeinsamen
 * Belegliste. Die alten Listenpfade bleiben als Weiterleitung bestehen, damit
 * Lesezeichen und interne Links nicht ins Leere laufen — die Detailrouten
 * darunter (/rechnungen/[id], /rechnungen/new, /rechnungen/nachtragen) sind
 * unverändert. */
export default function RechnungenRedirect() {
  redirect('/admin/finanzen/belege')
}
