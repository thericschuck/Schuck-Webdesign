import { ShieldAlert } from 'lucide-react'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { CATALOG } from '@/lib/helm/catalog/registry'
import { HelmTabs } from '@/components/admin/helm/HelmTabs'

const CATEGORY_ORDER = [
  'Kunden',
  'Projekte',
  'Produkte',
  'Akquise',
  'Finanzen',
  'Dokumente',
  'Wissensgraph',
  'Integrationen',
  'Todos',
  'Benachrichtigungen',
  'Sub-Agenten',
]

export default async function HelmFunctionsPage() {
  await assertAdmin()

  const byCategory = new Map<string, typeof CATALOG>()
  for (const def of CATALOG) {
    const category = def.category ?? 'Sonstige'
    byCategory.set(category, [...(byCategory.get(category) ?? []), def])
  }
  const categories = [...byCategory.keys()].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b) || a.localeCompare(b)
  )

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 md:top-0 md:left-60 overflow-y-auto bg-[#0d0d0d]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-white/8 bg-[#0d0d0d]/95 backdrop-blur-md px-6 py-4">
        <HelmTabs />
        <p className="text-xs text-white/40">{CATALOG.length} Funktionen im Katalog</p>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 flex flex-col gap-8">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
              {category}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(byCategory.get(category) ?? []).map((def) => (
                <div key={def.slug} className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{def.label}</p>
                    {def.requiresConfirmation && (
                      <span title="Bestätigungspflichtig" className="shrink-0 text-amber-400">
                        <ShieldAlert className="size-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">{def.description}</p>
                  <code className="mt-2 block text-[10px] text-white/25 font-mono">{def.slug}</code>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
