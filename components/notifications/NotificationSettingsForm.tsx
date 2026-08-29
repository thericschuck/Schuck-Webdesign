'use client'

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import {
  listPushDevices,
  removePushDevice,
  sendTestNotification,
  setEmailPreference,
} from '@/lib/actions/notifications'
import type { PushDevice } from '@/lib/domain/notifications'

/**
 * Push-Abos gelten IMMER nur für den Browser, in dem sie angelegt wurden. Der Schalter
 * hier zeigt deshalb nicht mehr eine globale Kontoeinstellung, sondern den echten Zustand
 * DIESES Geräts (`pushManager.getSubscription()`), abgeglichen mit den serverseitig
 * bekannten Abos. Vorher stand er auf einem zweiten Gerät auf "an", obwohl dort nie ein
 * Abo existierte — es sah aus, als wäre alles eingerichtet, und es kam trotzdem nichts an.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

function isIosSafariNotStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return isIos && !isStandalone
}

/* Browser-Fähigkeiten werden über useSyncExternalStore gelesen: beim Server-Rendern
 * liefert der Server-Snapshot `false`, im Browser der echte Wert. React rendert nach der
 * Hydration einmal nach — kein Hydration-Mismatch und kein setState im Effect (eine
 * `typeof window`-Prüfung beim Rendern hätte beides verursacht). */
const subscribeNever = () => () => {}
const serverSnapshotFalse = () => false
const readPushSupport = () => 'serviceWorker' in navigator && 'PushManager' in window
const readIosHint = () => isIosSafariNotStandalone()

/** Endpoint des Abos dieses Browsers — null, wenn hier keins existiert. */
async function currentEndpoint(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription?.endpoint ?? null
}

async function enablePush(): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('Push ist serverseitig nicht konfiguriert.')

  const permission = await Notification.requestPermission()
  if (permission === 'denied') {
    throw new Error(
      'Benachrichtigungen sind für diese Seite im Browser blockiert. Bitte in den Website-Einstellungen des Browsers wieder erlauben.'
    )
  }
  if (permission !== 'granted') throw new Error('Berechtigung für Benachrichtigungen wurde nicht erteilt.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  // Ein bestehendes Abo wiederverwenden, statt ein zweites für dasselbe Gerät anzulegen.
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const res = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!res.ok) throw new Error('Abo konnte nicht gespeichert werden.')

  return subscription.endpoint
}

async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {label}
        </span>
        <span className="block text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {description}
        </span>
      </span>
      <span className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-11 h-6 bg-gray-200 peer-checked:bg-gray-900 rounded-full transition-colors peer-disabled:opacity-50" />
        <span className="absolute left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function NotificationSettingsForm({
  initialDevices,
  initialEmailEnabled,
}: {
  initialDevices: PushDevice[]
  initialEmailEnabled: boolean
}) {
  const [devices, setDevices] = useState<PushDevice[]>(initialDevices)
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null)
  /** Erst nach dem ersten Abgleich mit dem Browser darf eine Warnung erscheinen. */
  const [loaded, setLoaded] = useState(false)

  const pushSupported = useSyncExternalStore(subscribeNever, readPushSupport, serverSnapshotFalse)
  const iosHint = useSyncExternalStore(subscribeNever, readIosHint, serverSnapshotFalse)

  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
  const [pushPending, startPushTransition] = useTransition()
  const [emailPending, startEmailTransition] = useTransition()
  const [busyEndpoint, setBusyEndpoint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // currentEndpoint() prüft selbst auf Service-Worker-Unterstützung, listPushDevices() ist
  // eine Server Action — der erste Ausdruck ist also ein await, kein synchrones setState.
  const refresh = useCallback(async () => {
    const [endpoint, serverDevices] = await Promise.all([currentEndpoint(), listPushDevices()])
    setThisEndpoint(endpoint)
    setDevices(serverDevices)
    setLoaded(true)
  }, [])

  // Ob DIESER Browser ein Push-Abo hat, lässt sich nur asynchron über
  // `pushManager.getSubscription()` beantworten — es gibt dafür keine synchrone Quelle,
  // die `useSyncExternalStore` lesen könnte, und der Wert wird beim ersten Rendern
  // gebraucht (er bestimmt die Schalterstellung). Ein Effect ist hier also die einzige
  // Möglichkeit; die Regel greift, weil `refresh` intern setState aufruft.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  /** Nur "an", wenn dieser Browser ein Abo hat UND der Server es kennt. */
  const thisDeviceOn = !!thisEndpoint && devices.some((d) => d.endpoint === thisEndpoint)

  function handleEmailToggle(next: boolean) {
    setEmailEnabled(next)
    setError(null)
    setInfo(null)
    startEmailTransition(async () => {
      const result = await setEmailPreference(next)
      if (result.status === 'error') {
        setEmailEnabled(!next)
        setError(result.message)
      }
    })
  }

  function handlePushToggle(next: boolean) {
    setError(null)
    setInfo(null)
    startPushTransition(async () => {
      try {
        if (next) await enablePush()
        else await disablePush()
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Push-Benachrichtigungen konnten nicht geändert werden.')
      }
    })
  }

  function handleTest(endpoint?: string) {
    setError(null)
    setInfo(null)
    setBusyEndpoint(endpoint ?? 'all')
    startPushTransition(async () => {
      const result = await sendTestNotification(endpoint)
      setBusyEndpoint(null)
      if (result.status === 'error') setError(result.message)
      else setInfo('Testbenachrichtigung verschickt — sie sollte gleich auf dem Gerät erscheinen.')
      await refresh()
    })
  }

  function handleRemove(endpoint: string) {
    setError(null)
    setInfo(null)
    setBusyEndpoint(endpoint)
    startPushTransition(async () => {
      const result = await removePushDevice(endpoint)
      setBusyEndpoint(null)
      if (result.status === 'error') setError(result.message)
      // Auf dem eigenen Gerät auch das Browser-Abo wegräumen, sonst bleibt eine Leiche.
      else if (endpoint === thisEndpoint) await disablePush().catch(() => {})
      await refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleRow
        label="Push auf diesem Gerät"
        description="Gilt nur für diesen Browser — jedes Gerät muss einmal einzeln aktiviert werden."
        checked={thisDeviceOn}
        disabled={pushPending || !pushSupported || !loaded}
        onChange={handlePushToggle}
      />
      {loaded && !pushSupported && (
        <p className="text-xs text-amber-600 -mt-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
        </p>
      )}
      {pushSupported && iosHint && (
        <p className="text-xs text-amber-600 -mt-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Auf dem iPhone funktioniert Push erst, wenn diese Seite über „Teilen → Zum Home-Bildschirm&quot; hinzugefügt wurde.
        </p>
      )}

      {/* Geräteliste */}
      {devices.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
          {devices.map((device) => {
            const isThis = device.endpoint === thisEndpoint
            const busy = busyEndpoint === device.endpoint
            return (
              <div key={device.endpoint} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    {device.label}
                    {isThis && <span className="ml-1.5 text-gray-400 font-normal">· dieses Gerät</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                    seit {formatDate(device.createdAt)}
                    {device.lastUsedAt && ` · zuletzt zugestellt ${formatDate(device.lastUsedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTest(device.endpoint)}
                    disabled={pushPending}
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    {busy && busyEndpoint === device.endpoint ? '…' : 'Test'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(device.endpoint)}
                    disabled={pushPending}
                    className="text-[11px] font-medium text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ToggleRow
        label="E-Mail-Benachrichtigungen"
        description="Als E-Mail, zusätzlich oder statt Push. Gilt für das ganze Konto."
        checked={emailEnabled}
        disabled={emailPending}
        onChange={handleEmailToggle}
      />

      {info && (
        <p className="text-xs text-green-700" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {info}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
