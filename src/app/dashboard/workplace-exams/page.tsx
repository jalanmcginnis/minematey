'use client';

import { WorkplaceExamForm } from '@/components/workplace-exam-form';
import { WorkplaceExamsList } from '@/components/workplace-exams-list';
import { SitePhotoAttachmentLog } from '@/components/site-photo-attachment-log';
import { ActiveMineBadge } from '@/components/active-mine-badge';
import { Separator } from '@/components/ui/separator';
import { useActiveMine } from '@/context/MineContext';

export default function WorkplaceExamsPage() {
  // Consume the global active MSHA Mine ID from MineContext
  const { selectedMineId } = useActiveMine();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workplace Examination</h1>
          <p className="text-muted-foreground">
            Complete the form below to document a workplace safety examination or log standalone site photos.
          </p>
        </div>

        <ActiveMineBadge />
      </div>

      <WorkplaceExamForm selectedMineId={selectedMineId} />
      <Separator />
      <WorkplaceExamsList selectedMineId={selectedMineId} />
      <Separator />
      <SitePhotoAttachmentLog selectedMineId={selectedMineId} />
    </div>
  );
}
