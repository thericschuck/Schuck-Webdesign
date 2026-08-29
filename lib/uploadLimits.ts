// Geteilte Upload-Konstanten zwischen Client (Upload-Formulare, lib/resizeImage.ts,
// lib/use-direct-upload.ts) und Server (lib/domain/documents.ts).
//
// Dateien gehen NICHT mehr durch eine Server Action, sondern per signierter URL direkt
// vom Browser in den Supabase-Storage (siehe lib/use-direct-upload.ts). Damit fallen
// beide bisherigen Deckel weg: Next.js' `serverActions.bodySizeLimit` und – deutlich
// härter – Vercels 4,5-MB-Grenze für Request-Bodies, an der in Produktion vorher jeder
// größere Upload gescheitert wäre.

/** Zielgröße, auf die Bilder im Browser heruntergerechnet werden, bevor sie hochgeladen
 *  werden. Kein Fehler-Limit: wird sie nicht erreicht, geht die Datei trotzdem raus. */
export const IMAGE_TARGET_BYTES = 8 * 1024 * 1024

/** Längste Kante nach der Verkleinerung — reicht für Druck-Vorschau und Web allemal. */
export const IMAGE_MAX_DIMENSION = 2500

/** Harte Obergrenze, rein als Missbrauchs-/Vertipper-Schutz. Alles darunter lädt hoch,
 *  egal welcher Dateityp — Bilder werden vorher automatisch verkleinert. */
export const MAX_UPLOAD_SIZE_MB = 500
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}
