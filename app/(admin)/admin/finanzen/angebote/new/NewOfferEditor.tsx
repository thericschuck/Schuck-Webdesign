'use client'

import { useRouter } from 'next/navigation'
import { DocumentEditor, leererZustand, type ClientOption, type ProjectOption } from '@/components/documents/DocumentEditor'
import type { ArticleOption, PackageOption } from '@/components/documents/PositionsEditor'
import type { DocumentEditorPayload } from '@/components/documents/editor-types'
import { createOfferDraftAction } from '../actions'
import type { CompanySettings } from '@/types/database'

/** Dünne Client-Hülle: nimmt das Ergebnis der Server Action und leitet auf die
 * Detailseite des neu angelegten Entwurfs weiter. */
export function NewOfferEditor({
  clients,
  projects,
  articles,
  packages,
  companySettings,
}: {
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
  companySettings: CompanySettings
}) {
  const router = useRouter()

  async function speichern(payload: DocumentEditorPayload) {
    const result = await createOfferDraftAction(payload)
    if (result.status === 'success' && result.id) {
      router.push(`/admin/finanzen/angebote/${result.id}`)
    }
    return result
  }

  return (
    <DocumentEditor
      kind="angebot"
      initialState={leererZustand('angebot')}
      clients={clients}
      projects={projects}
      articles={articles}
      packages={packages}
      companySettings={companySettings}
      nummer={null}
      saveLabel="Entwurf anlegen"
      onSave={speichern}
    />
  )
}
