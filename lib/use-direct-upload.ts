'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { shrinkImageForUpload } from '@/lib/resizeImage'
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, formatMb } from '@/lib/uploadLimits'

/**
 * Datei-Upload in drei Schritten, ohne die Datei jemals durch eine Server Action zu
 * schicken:
 *
 *   1. verkleinern   — Bilder werden im Browser auf ein Byte-Budget gerechnet
 *   2. Ticket holen  — Server Action liefert eine signierte Storage-URL für genau
 *                      EINEN Pfad im Ordner des Kunden
 *   3. hochladen     — Browser → Supabase Storage, direkt
 *   4. registrieren  — Server Action legt die `documents`-Zeile an
 *
 * Damit ist der Upload weder von Next.js' `serverActions.bodySizeLimit` noch von Vercels
 * 4,5-MB-Grenze für Request-Bodies betroffen — und der Absturz "Unexpected end of form"
 * (abgebrochenes Multipart-Parsing) kann konstruktionsbedingt nicht mehr auftreten.
 */

export type UploadTicket = { status: 'ok'; path: string; token: string }
export type TicketResult = UploadTicket | { status: 'error'; message: string }
export type RegisterResult = { status: 'success'; fileName: string } | { status: 'error'; message: string }

export interface DirectUploadHandlers {
  /** Server Action: signierte Upload-URL für diesen Dateinamen erzeugen. */
  requestTicket: (fileName: string) => Promise<TicketResult>
  /** Server Action: nach dem Storage-Upload die `documents`-Zeile anlegen. */
  register: (path: string, fileName: string) => Promise<RegisterResult>
}

export type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'saving'

const PHASE_LABEL: Record<Exclude<UploadPhase, 'idle'>, string> = {
  preparing: 'Datei wird optimiert…',
  uploading: 'Wird hochgeladen…',
  saving: 'Wird gespeichert…',
}

export function useDirectUpload({ requestTicket, register }: DirectUploadHandlers) {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  /** Hinweis wie „Bild von 42,0 MB auf 5,8 MB verkleinert" — kein Fehler. */
  const [notice, setNotice] = useState<string | null>(null)
  const [uploadedName, setUploadedName] = useState<string | null>(null)

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
    setNotice(null)
    setUploadedName(null)
  }, [])

  const upload = useCallback(
    async (rawFile: File): Promise<boolean> => {
      setError(null)
      setNotice(null)
      setUploadedName(null)

      if (rawFile.size === 0) {
        setError('Die Datei ist leer.')
        return false
      }

      setPhase('preparing')
      let file = rawFile
      try {
        file = await shrinkImageForUpload(rawFile)
      } catch {
        file = rawFile
      }
      if (file.size < rawFile.size) {
        setNotice(`Bild von ${formatMb(rawFile.size)} MB auf ${formatMb(file.size)} MB verkleinert.`)
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        setPhase('idle')
        setError(
          `Datei zu groß (${formatMb(file.size)} MB) — maximal ${MAX_UPLOAD_SIZE_MB} MB. ` +
            'Bilder werden automatisch verkleinert, andere Dateitypen bitte vorher komprimieren (z.B. als ZIP).'
        )
        return false
      }

      const ticket = await requestTicket(file.name)
      if (ticket.status === 'error') {
        setPhase('idle')
        setError(ticket.message)
        return false
      }

      setPhase('uploading')
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type || 'application/octet-stream',
        })
      if (uploadError) {
        setPhase('idle')
        setError(`Upload fehlgeschlagen: ${uploadError.message}`)
        return false
      }

      setPhase('saving')
      const result = await register(ticket.path, file.name)
      setPhase('idle')
      if (result.status === 'error') {
        setError(result.message)
        return false
      }

      setUploadedName(result.fileName)
      return true
    },
    [requestTicket, register]
  )

  return {
    upload,
    reset,
    phase,
    pending: phase !== 'idle',
    phaseLabel: phase === 'idle' ? null : PHASE_LABEL[phase],
    error,
    setError,
    notice,
    uploadedName,
  }
}
