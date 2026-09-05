import Link from 'next/link'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { ladeEditorDaten } from '../../editor-data'
import { NewOfferEditor } from './NewOfferEditor'

export default async function NeuesAngebotPage() {
  await assertAdmin()
  const { clients, projects, articles, packages, companySettings } = await ladeEditorDaten()

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Link href="/admin/finanzen/belege" className="hover:text-gray-600 transition-colors">
          Belege
        </Link>
        <span>/</span>
        <span className="text-gray-700">Neues Angebot</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
          Neues Angebot
        </h1>
        <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Wird als Entwurf gespeichert — die Angebotsnummer fällt erst beim Stellen.
        </p>
      </div>

      <NewOfferEditor
        clients={clients}
        projects={projects}
        articles={articles}
        packages={packages}
        companySettings={companySettings}
      />
    </div>
  )
}
