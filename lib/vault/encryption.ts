import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'VAULT_ENCRYPTION_KEY fehlt in den Umgebungsvariablen. Ohne diesen Server-Key kann der Passwort-Tresor nicht ver-/entschlüsseln.'
    )
  }
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) {
    throw new Error('VAULT_ENCRYPTION_KEY muss ein 32-Byte-Hex-String sein (64 Hex-Zeichen).')
  }
  return key
}

/** Verschlüsselt ein Klartext-Passwort. Ergebnis: base64(iv || authTag || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

/** Kehrt encryptSecret() um. Wirft bei manipulierten/falschen Daten (Auth-Tag-Check). */
export function decryptSecret(payload: string): string {
  const key = getKey()
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, IV_LENGTH)
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
