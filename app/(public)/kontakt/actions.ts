'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export type ContactResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function submitContact(
  _prev: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const name = formData.get('name')?.toString().trim()
  const email = formData.get('email')?.toString().trim()
  const type = formData.get('type')?.toString()
  const message = formData.get('message')?.toString().trim()

  if (!name || !email || !type || !message) {
    return { status: 'error', message: 'Bitte alle Felder ausfüllen.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('contact_submissions')
    .insert({ name, email, type, message })

  if (error) {
    console.error('[contact] DB insert error:', error.message)
    return { status: 'error', message: 'Fehler beim Senden. Bitte versuche es erneut.' }
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const date = new Date().toLocaleDateString('de-DE', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    await resend.emails.send({
      from: 'Schuck Webdesign <info@schuck-webdesign.de>',
      to: 'info@schuck-webdesign.de',
      replyTo: email,
      subject: `[Anfrage] ${type} – ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1C1C1E;">
          <div style="background:#080808;padding:24px 32px;border-radius:12px 12px 0 0;">
            <p style="margin:0;color:#7F77DD;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;">Schuck Webdesign</p>
            <h1 style="margin:8px 0 0;color:#F5F5F0;font-size:22px;font-weight:700;">Neue Anfrage</h1>
          </div>
          <div style="background:#ffffff;border:1px solid #e5e5e5;border-top:none;padding:32px;border-radius:0 0 12px 12px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;width:100px;">Name</td>
                <td style="padding:10px 0;font-weight:600;">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">E-Mail</td>
                <td style="padding:10px 0;"><a href="mailto:${email}" style="color:#7F77DD;text-decoration:none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Typ</td>
                <td style="padding:10px 0;">${type}</td>
              </tr>
            </table>
            <div style="background:#F7F5F0;border-left:3px solid #7F77DD;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Nachricht</p>
              <p style="margin:0;line-height:1.7;color:#1C1C1E;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <a href="mailto:${email}?subject=Re: ${type}" style="display:inline-block;background:#1C1C1E;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
              Direkt antworten →
            </a>
            <p style="margin:24px 0 0;color:#bbb;font-size:12px;">Gesendet am ${date} über schuck-webdesign.de/kontakt</p>
          </div>
        </div>
      `.trim(),
    })
  }

  return { status: 'success' }
}
