import type { JarvisTool } from '../tool-types'
import { optionalString, requireString } from './helpers'
import * as notificationsDomain from '@/lib/domain/notifications'

// ── send_notification ────────────────────────────────────────────────────────
// Nur Haupt-Orchestrator (requiresConfirmation:true) — analog zu send_followup_email.

const sendNotification: JarvisTool = {
  name: 'send_notification',
  requiresConfirmation: true,
  definition: {
    name: 'send_notification',
    description:
      'Sendet Eric eine Erinnerung/Benachrichtigung (Push und/oder E-Mail, je nach seinen Einstellungen unter ' +
      '/admin/einstellungen) — für wichtige Hinweise, die nicht bis zum nächsten Chat warten sollen. Erfordert Bestätigung.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Kurzer Titel der Benachrichtigung.' },
        body: { type: 'string', description: 'Text der Erinnerung.' },
        url: { type: 'string', description: 'Optionaler Link (z.B. /admin/todos), der beim Antippen geöffnet wird.' },
      },
      required: ['title', 'body'],
    },
  },
  async execute(args) {
    await notificationsDomain.notifyAdmin({
      title: requireString(args, 'title'),
      body: requireString(args, 'body'),
      url: optionalString(args, 'url') ?? undefined,
    })
    return { sent: true }
  },
}

export const notificationTools: JarvisTool[] = [sendNotification]
