'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa_install_dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setInstallEvent(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwa_install_dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl"
      style={{ backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#7F77DD]/15 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#7F77DD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            App installieren
          </p>
          <p className="text-xs text-white/45 mt-0.5 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Schuck Webdesign zum Homescreen hinzufügen für schnellen Zugriff.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="text-xs bg-[#7F77DD] text-white px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Installieren
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Nicht jetzt
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
          aria-label="Schließen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
