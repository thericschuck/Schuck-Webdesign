import { redirect } from 'next/navigation'

/** Siehe rechnungen/page.tsx — die Liste lebt jetzt unter /belege. */
export default function AngeboteRedirect() {
  redirect('/admin/finanzen/belege')
}
