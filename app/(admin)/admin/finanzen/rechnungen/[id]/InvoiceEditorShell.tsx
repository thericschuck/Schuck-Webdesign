'use client'

import { useRouter } from 'next/navigation'
import { DocumentEditor, type ClientOption, type ProjectOption } from '@/components/documents/DocumentEditor'
import type { ArticleOption, PackageOption } from '@/components/documents/PositionsEditor'
import type { DocumentEditorPayload, DocumentEditorState } from '@/components/documents/editor-types'
import { updateInvoiceFromEditorAction } from '../editor-actions'
import type { CompanySettings, InvoiceStatus } from '@/types/database'

/**
 * Rechnungsdetail: Editor links, Live-Vorschau rechts, darunter die
 * bestehenden Aktionen (stellen, versenden, Gutschrift …) als `children`.
 *
 * Ab Status „versendet" ist die Rechnung durch den GoBD-Trigger unveränderlich —
 * der Editor läuft dann im Nur-Lesen-Modus und dient als Beleganzeige.
 */
export function InvoiceEditorShell({
  invoiceId,
  status,
  nummer,
  initialState,
  clients,
  projects,
  articles,
  packages,
  companySettings,
  children,
}: {
  invoiceId: string
  status: InvoiceStatus
  nummer: string | null
  initialState: DocumentEditorState
  clients: ClientOption[]
  projects: ProjectOption[]
  articles: ArticleOption[]
  packages: PackageOption[]
  companySettings: CompanySettings
  children?: React.ReactNode
}) {
  const router = useRouter()

  async function speichern(payload: DocumentEditorPayload) {
    const result = await updateInvoiceFromEditorAction(invoiceId, payload)
    if (result.status === 'success') router.refresh()
    return result
  }

  return (
    <DocumentEditor
      kind="rechnung"
      initialState={initialState}
      clients={clients}
      projects={projects}
      articles={articles}
      packages={packages}
      companySettings={companySettings}
      nummer={nummer}
      readOnly={status !== 'entwurf'}
      saveLabel="Änderungen speichern"
      onSave={speichern}
      pdfUrl={`/api/admin/documents/pdf?typ=rechnung&id=${invoiceId}`}
    >
      {children}
    </DocumentEditor>
  )
}
