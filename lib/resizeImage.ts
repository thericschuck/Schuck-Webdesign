import { IMAGE_MAX_DIMENSION, IMAGE_TARGET_BYTES } from './uploadLimits'

/**
 * Verkleinert ein Bild im Browser, BEVOR es hochgeladen wird — so landet ein 90-MB-Foto
 * aus der Handykamera als handliche JPEG-Datei im Storage, ohne dass der Kunde irgendwas
 * von Hand verkleinern muss.
 *
 * Im Gegensatz zur früheren Version wird nicht nur an der Kantenlänge geschnitten
 * (ein 1800×1800-RAW-Export blieb dadurch riesig), sondern iterativ auf ein BYTE-Budget
 * hin komprimiert: erst Qualität senken, dann die Kantenlänge. Wird das Budget nicht
 * erreicht, ist das kein Fehler — es wird trotzdem die kleinste erreichte Fassung
 * genommen (bzw. das Original, falls keine Variante kleiner war).
 *
 * GIF (Animation ginge verloren) und SVG (Vektor, ohnehin winzig) werden bewusst nicht
 * angefasst. Formate, die der Browser nicht dekodieren kann (z.B. HEIC in Chrome),
 * fallen über `createImageBitmap` → null automatisch auf "unverändert" zurück.
 */
const SHRINKABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp'])

/** Formate mit Transparenz brauchen einen weißen Grund, sonst wird Alpha in JPEG schwarz. */
const NEEDS_WHITE_BACKGROUND = new Set(['image/png', 'image/webp', 'image/avif'])

const MIN_QUALITY = 0.55
const MAX_ATTEMPTS = 6

function jpegName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') + '.jpg'
}

function encode(
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
  whiteBackground: boolean
): Promise<Blob | null> {
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  if (whiteBackground) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

export async function shrinkImageForUpload(file: File): Promise<File> {
  if (!SHRINKABLE.has(file.type)) return file
  if (file.size <= IMAGE_TARGET_BYTES) return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const whiteBackground = NEEDS_WHITE_BACKGROUND.has(file.type)
  let maxDimension = IMAGE_MAX_DIMENSION
  let quality = 0.85
  let best: File | null = null

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const blob = await encode(bitmap, maxDimension, quality, whiteBackground)
      if (!blob) break

      const candidate = new File([blob], jpegName(file.name), {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      })
      if (!best || candidate.size < best.size) best = candidate
      if (candidate.size <= IMAGE_TARGET_BYTES) break

      // Erst an der Qualität drehen (kaum sichtbar), danach an der Auflösung.
      if (quality > MIN_QUALITY) quality = Math.max(MIN_QUALITY, quality - 0.12)
      else maxDimension = Math.round(maxDimension * 0.75)
    }
  } finally {
    bitmap.close()
  }

  return best && best.size < file.size ? best : file
}
