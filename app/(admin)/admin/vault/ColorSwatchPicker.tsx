'use client'

import { FOLDER_COLOR_KEYS, colorClasses, type FolderColorKey } from '@/lib/vault/colors'

export function ColorSwatchPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (color: FolderColorKey) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FOLDER_COLOR_KEYS.map((key) => {
        const active = (value ?? 'gray') === key
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            title={key}
            aria-label={key}
            className={`w-5 h-5 rounded-full shrink-0 transition-transform disabled:opacity-50 ${colorClasses(key).dot} ${
              active ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110'
            }`}
          />
        )
      })}
    </div>
  )
}
