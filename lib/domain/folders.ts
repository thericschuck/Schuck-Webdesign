import { createAdminClient } from '@/lib/supabase/admin'
import { DomainError } from './errors'

/**
 * Ordner-Domain (Migration 0035).
 *
 * Ein Ordner ist eine eigene Zeile in public.folders, kein abgeleiteter String mehr.
 * `path` ist immer der volle Pfad ("Verträge" bzw. "Verträge/2024"); jeder Zwischenpfad
 * existiert als eigene Zeile, damit die Navigation auch Ordner ohne direkten Inhalt
 * anzeigen kann.
 *
 * `projectId === null` ist die kundenweite Ebene ("Alle Projekte" im Explorer) — dort
 * dürfen Ordner und Dokumente ohne Projektzuordnung liegen.
 *
 * Alle Funktionen hier laufen über den Service-Role-Client, umgehen also RLS. Aufrufer
 * aus dem Portal müssen die Zugehörigkeit (clients.profile_id = auth.uid()) vorher selbst
 * prüfen — siehe app/(portal)/portal/documents/actions.ts.
 *
 * Teilbaum-Abfragen (umbenennen, löschen) filtern bewusst in JS statt per PostgREST-`or()`:
 * Ordnernamen sind freier Nutzertext und dürfen Komma, Punkt und Klammern enthalten —
 * genau die Zeichen, an denen die PostgREST-Filtersyntax zerbricht. Die Datenmengen liegen
 * pro Kunde im zweistelligen Bereich, der Unterschied ist praktisch nicht messbar.
 */

export interface FolderRow {
  id: string
  client_id: string
  project_id: string | null
  path: string
}

/** Ordnername darf keine Pfadtrenner enthalten und muss nach dem Trimmen etwas übrig lassen. */
export function normalizeFolderName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim()
  if (!name || name.length > 120) return null
  if (name.includes('/') || name.includes('\\')) return null
  if (name === '.' || name === '..') return null
  return name
}

/**
 * Bringt einen kompletten Pfad in Normalform: leere Segmente raus, getrimmt.
 * Liefert `null` für "kein Ordner" (Wurzel der jeweiligen Ebene).
 */
export function normalizeFolderPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const segments = raw
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return null
  if (segments.some((s) => normalizeFolderName(s) === null)) {
    throw new DomainError('Ungültiger Ordnerpfad.')
  }
  return segments.join('/')
}

/** Elternpfad eines Pfades — `null`, wenn der Ordner direkt auf der Wurzel liegt. */
export function parentPath(path: string): string | null {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? null : path.slice(0, idx)
}

/** Alle Pfade von der Wurzel bis zum Ziel: "a/b/c" → ["a", "a/b", "a/b/c"]. */
export function ancestorPaths(path: string): string[] {
  const segments = path.split('/')
  return segments.map((_, i) => segments.slice(0, i + 1).join('/'))
}

/** Trifft `candidate` den Ordner `root` selbst oder einen seiner Unterordner? */
function isAtOrUnder(candidate: string | null, root: string): boolean {
  return candidate === root || (candidate?.startsWith(root + '/') ?? false)
}

// ── list ──────────────────────────────────────────────────────────────────

/** Alle Ordner eines Kunden — projektbezogene und kundenweite gemeinsam. */
export async function listFolders(clientId: string): Promise<FolderRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('folders')
    .select('id, client_id, project_id, path')
    .eq('client_id', clientId)
    .order('path')

  if (error) throw new DomainError(error.message)
  return (data ?? []) as FolderRow[]
}

/** Ordner einer einzelnen Ebene (ein Projekt oder kundenweit). */
async function listFoldersInScope(clientId: string, projectId: string | null): Promise<FolderRow[]> {
  const all = await listFolders(clientId)
  return all.filter((f) => (f.project_id ?? null) === projectId)
}

// ── create ────────────────────────────────────────────────────────────────

export interface EnsureFolderInput {
  clientId: string
  projectId: string | null
  path: string
  createdBy?: string | null
}

/**
 * Legt einen Pfad samt aller Elternpfade an, falls noch nicht vorhanden.
 * Idempotent — wird auch von den Upload- und Generieren-Pfaden aufgerufen, damit ein
 * Dokument nie in einem Ordner landet, den die folders-Tabelle nicht kennt.
 */
export async function ensureFolderPath(input: EnsureFolderInput): Promise<void> {
  const path = normalizeFolderPath(input.path)
  if (!path) return

  const adminClient = createAdminClient()
  const rows = ancestorPaths(path).map((p) => ({
    client_id: input.clientId,
    project_id: input.projectId,
    path: p,
    created_by: input.createdBy ?? null,
  }))

  // onConflict nennt die Spalten des Unique-Index; ignoreDuplicates macht daraus ein
  // "ON CONFLICT DO NOTHING", sodass parallele Uploads sich nicht gegenseitig abschießen.
  const { error } = await adminClient
    .from('folders')
    .upsert(rows, { onConflict: 'client_id,project_id,path', ignoreDuplicates: true })

  if (error) throw new DomainError(error.message)
}

export interface CreateFolderInput {
  clientId: string
  projectId: string | null
  /** Elternordner, in dem der neue Ordner entsteht — `null` = Wurzel der Ebene. */
  parent: string | null
  name: string
  createdBy?: string | null
}

/** Legt einen — auch leeren — Ordner an und gibt seinen vollen Pfad zurück. */
export async function createFolder(input: CreateFolderInput): Promise<string> {
  const name = normalizeFolderName(input.name)
  if (!name) throw new DomainError('Ungültiger Ordnername.')

  const parent = input.parent ? normalizeFolderPath(input.parent) : null
  const path = parent ? `${parent}/${name}` : name

  const existing = await listFoldersInScope(input.clientId, input.projectId)
  if (existing.some((f) => f.path === path)) {
    throw new DomainError(`Ordner „${name}" existiert hier bereits.`)
  }

  await ensureFolderPath({
    clientId: input.clientId,
    projectId: input.projectId,
    path,
    createdBy: input.createdBy,
  })

  return path
}

// ── rename ────────────────────────────────────────────────────────────────

export interface RenameFolderInput {
  clientId: string
  projectId: string | null
  path: string
  newName: string
}

/**
 * Benennt das letzte Segment eines Pfades um und zieht Unterordner sowie alle
 * betroffenen Dokumente mit. Gibt den neuen Pfad zurück.
 */
export async function renameFolder(input: RenameFolderInput): Promise<string> {
  const oldPath = normalizeFolderPath(input.path)
  if (!oldPath) throw new DomainError('Ordner nicht gefunden.')

  const name = normalizeFolderName(input.newName)
  if (!name) throw new DomainError('Ungültiger Ordnername.')

  const parent = parentPath(oldPath)
  const newPath = parent ? `${parent}/${name}` : name
  if (newPath === oldPath) return oldPath

  const scopeFolders = await listFoldersInScope(input.clientId, input.projectId)

  if (scopeFolders.some((f) => f.path === newPath)) {
    throw new DomainError(`Ordner „${name}" existiert hier bereits.`)
  }

  const affected = scopeFolders.filter((f) => isAtOrUnder(f.path, oldPath))
  if (affected.length === 0) throw new DomainError('Ordner nicht gefunden.')

  // Zeilenweise umschreiben — PostgREST kennt kein "set path = replace(path, …)".
  const adminClient = createAdminClient()
  for (const row of affected) {
    const { error } = await adminClient
      .from('folders')
      .update({ path: newPath + row.path.slice(oldPath.length) })
      .eq('id', row.id)
    if (error) throw new DomainError(error.message)
  }

  await moveDocumentsBetweenPaths(input.clientId, input.projectId, oldPath, newPath)

  return newPath
}

// ── delete ────────────────────────────────────────────────────────────────

export interface DeleteFolderInput {
  clientId: string
  projectId: string | null
  path: string
}

/**
 * Löscht einen Ordner samt Unterordnern. Enthaltene Dokumente werden **nicht** gelöscht,
 * sondern in den Elternordner hochgezogen — ein Klick auf "Ordner löschen" darf keine
 * Dateien vernichten. Gibt zurück, wie viele Dokumente verschoben wurden.
 */
export async function deleteFolder(input: DeleteFolderInput): Promise<number> {
  const path = normalizeFolderPath(input.path)
  if (!path) throw new DomainError('Ordner nicht gefunden.')

  const scopeFolders = await listFoldersInScope(input.clientId, input.projectId)
  const affected = scopeFolders.filter((f) => isAtOrUnder(f.path, path))
  if (affected.length === 0) throw new DomainError('Ordner nicht gefunden.')

  const moved = await moveDocumentsBetweenPaths(input.clientId, input.projectId, path, parentPath(path), true)

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('folders')
    .delete()
    .in('id', affected.map((f) => f.id))

  if (error) throw new DomainError(error.message)

  return moved
}

// ── move ──────────────────────────────────────────────────────────────────

export interface MoveDocumentInput {
  documentId: string
  targetProjectId: string | null
  targetFolder: string | null
}

export interface MoveDocumentResult {
  clientId: string
  /** Projekt, aus dem das Dokument kam — für die Revalidierung der Quellseite. */
  previousProjectId: string | null
  targetFolder: string | null
}

/**
 * Verschiebt ein Dokument in eine andere Ebene (Projekt oder kundenweit) und/oder einen
 * anderen Ordner. Das Storage-Objekt bleibt unangetastet — `file_url` liegt im Ordner der
 * client_id, und der Kunde ändert sich beim Verschieben nie.
 */
export async function moveDocument(input: MoveDocumentInput): Promise<MoveDocumentResult> {
  const adminClient = createAdminClient()

  const { data: doc, error: readError } = await adminClient
    .from('documents')
    .select('id, client_id, project_id')
    .eq('id', input.documentId)
    .maybeSingle()

  if (readError) throw new DomainError(readError.message)
  if (!doc) throw new DomainError('Dokument nicht gefunden.')

  // Zielprojekt muss demselben Kunden gehören — sonst läge ein Dokument in einem Projekt,
  // dessen Kunde gar keinen Zugriff auf das Storage-Objekt hat.
  if (input.targetProjectId) {
    const { data: project } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', input.targetProjectId)
      .eq('client_id', doc.client_id)
      .maybeSingle()
    if (!project) throw new DomainError('Zielprojekt gehört nicht zu diesem Kunden.')
  }

  const targetFolder = input.targetFolder ? normalizeFolderPath(input.targetFolder) : null

  if (targetFolder) {
    await ensureFolderPath({
      clientId: doc.client_id,
      projectId: input.targetProjectId,
      path: targetFolder,
    })
  }

  const { error } = await adminClient
    .from('documents')
    .update({ project_id: input.targetProjectId, folder: targetFolder })
    .eq('id', input.documentId)

  if (error) throw new DomainError(error.message)

  return {
    clientId: doc.client_id,
    previousProjectId: doc.project_id ?? null,
    targetFolder,
  }
}

// ── intern ────────────────────────────────────────────────────────────────

/**
 * Schreibt `documents.folder` für alle Dokumente unterhalb von `from` auf `to` um.
 * `to === null` zieht sie auf die Wurzel der Ebene.
 *
 * `flatten` unterscheidet die beiden Aufrufer:
 *   * Umbenennen (`false`): die Unterstruktur bleibt erhalten — aus "Alt/2026" wird
 *     "Neu/2026", denn die Unterordner existieren weiter und werden nur mit umbenannt.
 *   * Löschen (`true`): ALLE Dateien landen flach in `to`. Die Unterordner verschwinden
 *     mit, ein erhaltener Suffix würde die Datei in einem Ordner zurücklassen, den es
 *     nicht mehr gibt — sie wäre über die Navigation nicht mehr erreichbar.
 *
 * Gibt die Anzahl der betroffenen Dokumente zurück.
 */
async function moveDocumentsBetweenPaths(
  clientId: string,
  projectId: string | null,
  from: string,
  to: string | null,
  flatten = false
): Promise<number> {
  const adminClient = createAdminClient()

  const { data, error: readError } = await adminClient
    .from('documents')
    .select('id, folder, project_id')
    .eq('client_id', clientId)

  if (readError) throw new DomainError(readError.message)

  const docs = (data ?? []).filter(
    (d) => (d.project_id ?? null) === projectId && isAtOrUnder(d.folder, from)
  ) as { id: string; folder: string }[]

  for (const doc of docs) {
    const suffix = flatten ? '' : doc.folder.slice(from.length) // "" oder "/unterordner"
    const next = to ? to + suffix : null

    const { error } = await adminClient.from('documents').update({ folder: next }).eq('id', doc.id)
    if (error) throw new DomainError(error.message)
  }

  return docs.length
}
