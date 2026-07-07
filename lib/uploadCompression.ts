import sharp from 'sharp'

const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_DIMENSION = 2500
const JPEG_QUALITY = 80

export interface CompressedFile {
  buffer: Buffer
  mimeType: string
  /** Neue Dateiendung, falls sich das Format geändert hat (z.B. png → jpg). */
  extension: string
}

/**
 * Verkleinert/re-encoded ein zu großes Bild serverseitig mit `sharp` — Server-seitiges
 * Äquivalent zu lib/resizeImage.ts (Canvas-basiert, nur client-seitig und nur in 2 von 3
 * Upload-Formularen eingebunden). Greift hier für JEDEN Upload-Pfad als Sicherheitsnetz.
 * Gibt `null` zurück, wenn der Dateityp nicht komprimierbar ist oder sharp scheitert
 * (z.B. korruptes Bild) — der Aufrufer behandelt das dann wie "keine Kompression möglich".
 */
export async function compressImageIfPossible(buffer: Buffer, mimeType: string): Promise<CompressedFile | null> {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(mimeType)) return null

  try {
    const compressed = await sharp(buffer)
      .rotate() // EXIF-Ausrichtung übernehmen, bevor die Größe gelesen wird
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    return { buffer: compressed, mimeType: 'image/jpeg', extension: 'jpg' }
  } catch (error) {
    console.error('[uploadCompression] Bild-Kompression fehlgeschlagen:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Best-effort PDF-Verkleinerung über pdf-lib: spart nur bei redundanten PDF-internen
 * Objekt-Streams etwas ein, codiert KEINE eingebetteten Bilder neu. Bei bildlastigen PDFs
 * daher oft nur geringe Wirkung — aber immer noch "ein Versuch" statt sofortiger Ablehnung.
 */
export async function compressPdfIfPossible(buffer: Buffer): Promise<Buffer | null> {
  try {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const saved = await doc.save({ useObjectStreams: true })
    return Buffer.from(saved)
  } catch (error) {
    console.error('[uploadCompression] PDF-Kompression fehlgeschlagen:', error instanceof Error ? error.message : error)
    return null
  }
}
