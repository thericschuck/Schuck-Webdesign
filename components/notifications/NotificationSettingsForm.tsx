'use client'

import { useState, useTransition } from 'react'
import { setEmailPreference } from '@/lib/actions/notifications'

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

async function enablePush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('Push ist serverseitig nicht konfiguriert.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Berechtigung für Benachrichtigungen wurde nicht erteilt.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const res = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!res.ok) throw new Error('Abo konnte nicht gespeichert werden.')
}

async function disablePush() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
      return
    }
  }
  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
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
  initialPushEnabled,
  initialEmailEnabled,
}: {
  initialPushEnabled: boolean
  initialEmailEnabled: boolean
}) {
  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled)
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
  const [pushPending, startPushTransition] = useTransition()
  const [emailPending, startEmailTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const pushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const iosHint = isIosSafariNotStandalone()

  function handleEmailToggle(next: boolean) {
    setEmailEnabled(next)
    setError(null)
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
    startPushTransition(async () => {
      try {
        if (next) await enablePush()
        else await disablePush()
        setPushEnabled(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Push-Benachrichtigungen konnten nicht geändert werden.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleRow
        label="Push-Benachrichtigungen"
        description="Direkt auf diesem Gerät, auch wenn die Seite geschlossen ist."
        checked={pushEnabled}
        disabled={pushPending || !pushSupported}
        onChange={handlePushToggle}
      />
      {!pushSupported && (
        <p className="text-xs text-amber-600 -mt-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
        </p>
      )}
      {pushSupported && iosHint && (
        <p className="text-xs text-amber-600 -mt-2" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Auf dem iPhone funktioniert Push erst, wenn diese Seite über „Teilen → Zum Home-Bildschirm&quot; hinzugefügt wurde.
        </p>
      )}

      <ToggleRow
        label="E-Mail-Benachrichtigungen"
        description="Als E-Mail, zusätzlich oder statt Push."
        checked={emailEnabled}
        disabled={emailPending}
        onChange={handleEmailToggle}
      />

      {error && (
        <p className="text-xs text-red-600" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
