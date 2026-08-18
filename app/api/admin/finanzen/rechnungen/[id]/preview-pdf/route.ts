import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { DomainError } from '@/lib/domain/errors'
import * as financeDomain from '@/lib/domain/finance'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertAdmin()
  const { id } = await params

  try {
    const pdfBytes = await financeDomain.previewInvoicePdf(id)
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="Vorschau.pdf"' },
    })
  } catch (error) {
    const message = error instanceof DomainError ? error.message : 'Vorschau konnte nicht erzeugt werden.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
