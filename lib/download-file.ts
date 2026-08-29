/**
 * Löst einen Datei-Download über eine signierte Supabase-Storage-URL aus.
 *
 * Bewusst OHNE `fetch` + Blob: bei einem 80-MB-Upload (siehe lib/uploadLimits.ts) würde
 * die Datei sonst zuerst komplett in den Arbeitsspeicher des Browsers geladen, bevor
 * überhaupt etwas passiert. Stattdessen erzeugt der Server die signierte URL mit dem
 * `download`-Parameter — Supabase setzt daraufhin `Content-Disposition: attachment`,
 * und der Browser lädt direkt und gestreamt herunter.
 *
 * (Das `download`-Attribut am <a> allein reicht nicht: es wird bei cross-origin-Links
 * ignoriert — deshalb muss der Dateiname über den Header kommen.)
 */
export async function triggerDownload(
  getSignedUrl: (fileUrl: string, downloadName?: string) => Promise<string | null>,
  fileUrl: string,
  fileName: string
): Promise<void> {
  const url = await getSignedUrl(fileUrl, fileName)
  if (!url) return

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
