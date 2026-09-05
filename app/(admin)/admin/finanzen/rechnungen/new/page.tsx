import Link from 'next/link'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { ladeEditorDaten } from '../../editor-data'
import { NewInvoiceEditor } from './NewInvoiceEditor'

export default async function NewInvoicePage() {
  await assertAdmin()
  const { clients, projects, articles, packages, companySettings } = await ladeEditorDaten()

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen/belege" className="hover:text-gray-600 transition-colors">
          Belege
        </Link>
        <span>/</span>
        <span className="text-gray-700">Neue Rechnung</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
            Neue Rechnung
          </h1>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Wird als Entwurf gespeichert — die Rechnungsnummer fällt erst beim Stellen.
          </p>
        </div>
        <Link
          href="/admin/finanzen/rechnungen/nachtragen"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          Bestehende Rechnung nachtragen →
        </Link>
      </div>

      <NewInvoiceEditor
        clients={clients}
        projects={projects}
        articles={articles}
        packages={packages}
        companySettings={companySettings}
      />
    </div>
  )
}
