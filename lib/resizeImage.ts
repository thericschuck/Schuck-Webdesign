const RESIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PX = 2000
const QUALITY = 0.88

export async function resizeIfNeeded(file: File): Promise<File> {
  if (!RESIZABLE.has(file.type)) return file

  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file

  const { width, height } = bmp

  if (width <= MAX_PX && height <= MAX_PX) {
    bmp.close()
    return file
  }

  const ratio = Math.min(MAX_PX / width, MAX_PX / height)
  const w = Math.round(width * ratio)
  const h = Math.round(height * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  return new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { resolve(file); return }
        const name = file.name.replace(/\.(png|webp|jpe?g)$/i, '.jpg')
        resolve(new File([blob], name, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      QUALITY,
    )
  })
}
