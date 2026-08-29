import { PortalExplorerSkeleton, PortalHeaderSkeleton } from '@/components/portal/PortalSkeletons'

export default function DocumentsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <PortalHeaderSkeleton titleWidth="w-44" />
      <PortalExplorerSkeleton rows={6} />
    </div>
  )
}
