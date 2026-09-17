import { z } from 'zod'
import { defineTool, type HelmToolDef } from '../types'
import * as notificationsDomain from '@/lib/domain/notifications'

// ── send_notification ────────────────────────────────────────────────────────
// Nur Haupt-Orchestrator (requiresConfirmation:true) — analog zu send_followup_email.

const sendNotification = defineTool({
  slug: 'send_notification',
  label: 'Benachrichtigung senden',
  description:
    'Sendet Eric eine Erinnerung/Benachrichtigung (Push und/oder E-Mail, je nach seinen Einstellungen unter ' +
    '/admin/einstellungen) — für wichtige Hinweise, die nicht bis zum nächsten Chat warten sollen. Erfordert Bestätigung.',
  requiresConfirmation: true,
  schema: z.object({
    title: z.string().describe('Kurzer Titel der Benachrichtigung.'),
    body: z.string().describe('Text der Erinnerung.'),
    url: z.string().optional().describe('Optionaler Link (z.B. /admin/todos), der beim Antippen geöffnet wird.'),
  }),
  summarize: (args) => `Benachrichtigung an Eric senden: "${args.title}".`,
  async execute(args) {
    await notificationsDomain.notifyAdmin({
      title: args.title,
      body: args.body,
      url: args.url,
    })
    return { sent: true }
  },
})

export const notificationTools: HelmToolDef[] = [sendNotification]
