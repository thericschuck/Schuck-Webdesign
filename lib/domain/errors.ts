/**
 * Fehler aus der Domain-Schicht (lib/domain/*). Trägt eine sprechende,
 * bereits nutzerlesbare Message — Consumer (JARVIS-Tools, Server Actions)
 * reichen `error.message` direkt weiter, ohne sie neu zu formulieren.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
