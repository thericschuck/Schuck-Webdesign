'use client'

import { useRouter } from 'next/navigation'
import { DocumentEditor, leererZustand, type ClientOption, type ProjectOption } from '@/components/documents/DocumentEditor'
import type { ArticleOption, PackageOption } from '@/components/documents/PositionsEditor'
import type { DocumentEditorPayload } from '@/components/documents/editor-types'
import { createInvoiceFromEditorAction } from '../editor-actions'
import type { CompanySettings } from '@/types/database'

export function NewInvoiceEditor({
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
    const result = await createInvoiceFromEditorAction(payload)
    if (result.status === 'success' && result.id) {
      router.push(`/admin/finanzen/rechnungen/${result.id}`)
    }
    return result
  }

  return (
    <DocumentEditor
      kind="rechnung"
      initialState={leererZustand('rechnung')}
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
