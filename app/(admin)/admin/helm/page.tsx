import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/assert-admin'
import { toolLabelMap } from '@/lib/helm/catalog/registry'
import { listHelmConversations, loadHelmMessages, resolveActiveConversationId } from '@/lib/helm/persistence'
import { HelmWidget } from '@/components/admin/HelmWidget'
import { HelmSessionList } from '@/components/admin/helm/HelmSessionList'

export default async function HelmPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const supabase = await assertAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { c: requestedId } = await searchParams

  const conversationId = await resolveActiveConversationId(user.id, requestedId ?? null)
  const [sessions, initialMessages] = await Promise.all([
    listHelmConversations(user.id),
    loadHelmMessages(conversationId),
  ])

  return (
    <HelmWidget
      mode="full"
      toolLabels={toolLabelMap()}
      conversationId={conversationId}
      initialMessages={initialMessages}
      sessionList={<HelmSessionList sessions={sessions} activeId={conversationId} />}
    />
  )
}
