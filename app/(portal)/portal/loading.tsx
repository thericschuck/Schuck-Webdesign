import {
  PortalBannerSkeleton,
  PortalDocumentListSkeleton,
  PortalProjectCardsSkeleton,
} from '@/components/portal/PortalSkeletons'

export default function PortalLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      <PortalBannerSkeleton />
      <PortalProjectCardsSkeleton cards={2} />
      <PortalDocumentListSkeleton rows={3} />
    </div>
  )
}
