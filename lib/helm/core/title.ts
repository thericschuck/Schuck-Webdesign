import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { renameHelmConversation } from '../persistence'

const TITLE_SYSTEM_PROMPT = `Fasse den folgenden Chat-Auftakt in einem kurzen Titel zusammen (max. 6 Wörter, keine Anführungszeichen, kein Punkt am Ende). Antworte NUR mit dem Titel, sonst nichts.`

/**
 * Generiert asynchron (fire-and-forget) einen Titel für eine neue Konversation aus deren
 * erster Nutzernachricht — analog Athenas titleConversation() mit einem billigen
 * Utility-Modell statt dem eigentlichen Orchestrator-Modell. Läuft nach dem Antworten,
 * damit es die eigentliche Chat-Antwort nicht verzögert; Fehler werden nur geloggt.
 */
export function titleConversationInBackground(conversationId: string, firstUserText: string): void {
  void (async () => {
    try {
      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5'),
        system: TITLE_SYSTEM_PROMPT,
        prompt: firstUserText.slice(0, 2000),
      })
      const title = text.trim().replace(/^"|"$/g, '').slice(0, 200)
      if (title) await renameHelmConversation(conversationId, title)
    } catch (error) {
      console.error('[helm] Titel-Generierung fehlgeschlagen:', error instanceof Error ? error.message : error)
    }
  })()
}
