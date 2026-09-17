// Interner Trigger, den die HELM-Seite beim Laden automatisch sendet, um die proaktive
// Cold-Start-Begrüßung auszulösen. Kein normaler Chat-Text.
export const HELM_COLD_START_TRIGGER = '__cold_start__'

// Obergrenze für Schritte innerhalb EINES Agent-Laufs (streamText stopWhen) — ersetzt das
// alte MAX_ITERATIONS aus lib/jarvis/agent.ts.
export const MAX_STEPS = 10

// Reflection Loop: nach wie vielen fehlgeschlagenen Versuchen desselben Tools in einem Lauf
// HELM eskaliert statt Claude einen weiteren Versuch vorzuschlagen.
export const MAX_TOOL_RETRIES = 3
