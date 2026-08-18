import { Resend } from 'resend'
import { logIntegrationCall } from '@/lib/integrations/log'

const FROM_ADDRESS = 'Schuck Webdesign <noreply@schuck-webdesign.de>'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  attachment?: { filename: string; content: Uint8Array }
}

export interface SendEmailResult {
  sent: boolean
  error?: string
}

/**
 * Zentraler Resend-Wrapper für alle server-seitigen E-Mail-Versände
 * (Dokumente, Follow-Ups, Rechnungen). Wirft nie — Aufrufer entscheiden
 * anhand von `sent`, ob ein DomainError daraus wird.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    const error = 'RESEND_API_KEY ist nicht konfiguriert.'
    await logIntegrationCall('email', false, error)
    return { sent: false, error }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachment
      ? [{ filename: input.attachment.filename, content: Buffer.from(input.attachment.content) }]
      : undefined,
  })

  if (error) {
    console.error('[sendEmail] Resend error:', error.message)
    await logIntegrationCall('email', false, error.message)
    return { sent: false, error: error.message }
  }

  await logIntegrationCall('email', true)
  return { sent: true }
}
