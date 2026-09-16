export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

const LABELS = ['Sehr schwach', 'Schwach', 'Okay', 'Stark', 'Sehr stark'] as const

/**
 * Leichtgewichtige Heuristik (Länge + Zeichenvielfalt) statt einer externen
 * Bibliothek (zxcvbn etc.) — für die grobe visuelle Einschätzung im Formular
 * reicht das; es muss keine echte Angriffszeit schätzen.
 */
export function estimatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '' }

  let variety = 0
  if (/[a-z]/.test(password)) variety++
  if (/[A-Z]/.test(password)) variety++
  if (/[0-9]/.test(password)) variety++
  if (/[^a-zA-Z0-9]/.test(password)) variety++

  const lengthScore = password.length >= 20 ? 2 : password.length >= 12 ? 1.5 : password.length >= 8 ? 1 : 0
  const raw = lengthScore + variety * 0.6

  const score: PasswordStrength['score'] = raw < 1.2 ? 0 : raw < 2 ? 1 : raw < 2.8 ? 2 : raw < 3.6 ? 3 : 4
  return { score, label: LABELS[score] }
}
