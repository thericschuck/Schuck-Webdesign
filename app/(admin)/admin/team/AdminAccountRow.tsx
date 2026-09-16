'use client'

import { useState, useTransition } from 'react'
import { resendAdminInviteAction, revokeAdminAction, reactivateAdminAction } from './actions'
import type { AdminAccount } from '@/lib/auth/invite-admin'

type Feedback = { status: 'error' | 'success'; message: string } | null

const STATUS_LABEL: Record<AdminAccount['status'], string> = {
  pending: 'Einladung offen',
  active: 'Aktiv',
  revoked: 'Zugang entzogen',
}

const STATUS_COLOR: Record<AdminAccount['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-green-50 text-green-700',
  revoked: 'bg-gray-100 text-gray-500',
}

export function AdminAccountRow({ account, isSelf }: { account: AdminAccount; isSelf: boolean }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  function run(action: () => Promise<Feedback>) {
    setFeedback(null)
    startTransition(async () => {
      const result = await action()
      setFeedback(result)
    })
  }

  return (
    <div className="flex flex-col gap-2 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {account.fullName || account.email}
            {isSelf && <span className="text-gray-400 font-normal"> (Du)</span>}
          </p>
          <p className="text-xs text-gray-400 truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            {account.email}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[account.status]}`}
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {STATUS_LABEL[account.status]}
          </span>

          {account.status === 'pending' && (
            <button
              onClick={() => run(() => resendAdminInviteAction(account.email))}
              disabled={pending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {pending ? '…' : 'Erneut einladen'}
            </button>
          )}

          {account.status !== 'revoked' && !isSelf && (
            <button
              onClick={() => {
                if (!confirm(`Zugang für ${account.email} wirklich entziehen?`)) return
                run(() => revokeAdminAction(account.id))
              }}
              disabled={pending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {pending ? '…' : 'Zugang entziehen'}
            </button>
          )}

          {account.status === 'revoked' && (
            <button
              onClick={() => run(() => reactivateAdminAction(account.id))}
              disabled={pending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {pending ? '…' : 'Reaktivieren'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <p
          className={`text-xs leading-relaxed ${feedback.status === 'success' ? 'text-green-700' : 'text-red-700'}`}
          style={{ fontFamily: 'var(--font-dm-sans)' }}
          role="status"
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
