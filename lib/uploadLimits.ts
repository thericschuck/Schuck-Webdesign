// Geteilte Konstante zwischen Server (lib/domain/documents.ts) und Client (Upload-Formulare) —
// damit Client-seitig VOR dem Absenden geprüft werden kann, statt eine zu große Datei erst an
// die Server Action zu schicken. Next.js bricht das Multipart-Parsing einer Server Action bei
// Überschreiten von next.config.ts' `experimental.serverActions.bodySizeLimit` mitten im Stream
// ab — das äußert sich nicht als handhabbarer Form-Fehler, sondern als harter Absturz
// ("Unexpected end of form"), den die Server Action selbst nicht abfangen kann. Die
// Client-seitige Vorabprüfung verhindert, dass eine zu große Datei überhaupt abgeschickt wird.
export const MAX_UPLOAD_SIZE_MB = 80
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}
