'use client';

import { EquipmentExamForm } from "@/components/equipment-exam-form";
import { EquipmentExamsList } from "@/components/equipment-exams-list";
import { EquipmentPhotoAttachmentLog } from "@/components/equipment-photo-attachment-log";
import { ActiveMineBadge } from "@/components/active-mine-badge";
import { Separator } from "@/components/ui/separator";
import { useActiveMine } from "@/context/MineContext";

export default function EquipmentExamsPage() {
    // Consume the global active MSHA Mine ID from MineContext
    const { selectedMineId } = useActiveMine();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Equipment Examination</h1>
                    <p className="text-muted-foreground">
                        Complete the form below to document a pre-operational equipment check or log standalone equipment defect photos.
                    </p>
                </div>

                <ActiveMineBadge />
            </div>

            <EquipmentExamForm selectedMineId={selectedMineId} />
            <Separator />
            <EquipmentExamsList selectedMineId={selectedMineId} />
            <Separator />
            <EquipmentPhotoAttachmentLog selectedMineId={selectedMineId} />
        </div>
    );
}
