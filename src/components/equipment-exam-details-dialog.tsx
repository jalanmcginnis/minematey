'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
} from 'lucide-react';

interface EquipmentExamDetailsDialogProps {
  exam: any;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLogCorrectiveAction?: (exam: any) => void;
}

export function EquipmentExamDetailsDialog({
  exam,
  isOpen,
  onOpenChange,
  onLogCorrectiveAction,
}: EquipmentExamDetailsDialogProps) {
  if (!exam) return null;

  const rawStatus = String(exam.status || '').trim();
  const rawSafetyStatus = String(
    exam.safetyStatus || exam.status || 'Safe to Operate'
  ).trim();
  const defectText = String(exam.defectDetails || exam.defectsFound || '').trim();

  const isCorrected =
    rawStatus.toLowerCase() === 'corrected' ||
    Boolean(exam.correctedAt && (exam.correctiveActionNotes || exam.correctiveAction));

  const isDefectRecord =
    isCorrected ||
    rawStatus.toLowerCase() === 'open' ||
    rawStatus.toLowerCase() === 'under repair' ||
    rawStatus.toLowerCase().includes('defect') ||
    rawSafetyStatus.toLowerCase().includes('defect') ||
    rawSafetyStatus.toLowerCase().includes('red') ||
    rawSafetyStatus.toLowerCase() === 'needs_repair' ||
    rawSafetyStatus.toLowerCase() === 'out_of_service' ||
    (defectText.length > 0 && defectText.toLowerCase() !== 'none');

  const isOpenDefect = isDefectRecord && !isCorrected;

  const formatDateValue = (val: any) => {
    if (!val) return '—';
    if (val?.toDate) {
      return val.toDate().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime())
      ? String(val)
      : parsed.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const equipmentLabel =
    exam.equipmentUnit || exam.equipmentNumber || exam.equipmentId || 'Equipment';
  const inspectorLabel =
    exam.inspectorName || exam.inspector || exam.operator || '—';
  const hoursLabel = exam.hourMeterReading ?? exam.operatingHours ?? '—';
  const dateReportedStr = formatDateValue(
    exam.date || exam.examDate || exam.createdAt
  );
  const dateCorrectedStr = exam.correctedAt
    ? formatDateValue(exam.correctedAt)
    : 'Pending Correction';
  const hazardDescription =
    defectText || 'Mechanical or safety defect identified';
  const correctiveActionTaken =
    exam.correctiveActionNotes ||
    exam.correctiveAction ||
    'No corrective action recorded yet.';
  const resolvedBy = exam.correctedByName || '—';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Equipment Exam & Defect Resolution Details</DialogTitle>
          <DialogDescription>
            Full report and corrective action chain for the examination of{' '}
            <span className="font-semibold text-primary">{equipmentLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-right font-semibold text-muted-foreground">
                Status
              </span>
              <div className="col-span-1 flex flex-wrap items-center gap-1.5">
                {!isDefectRecord ? (
                  <Badge variant="secondary">Safe to Operate</Badge>
                ) : (
                  <>
                    <Badge variant="destructive">
                      {rawSafetyStatus === 'Open' || rawSafetyStatus === 'Corrected'
                        ? 'Defect Found'
                        : rawSafetyStatus.replace('_', ' ')}
                    </Badge>
                    {isCorrected ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Corrected
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Open Defect
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-right font-semibold text-muted-foreground">
                Hour Meter
              </span>
              <span className="col-span-1">{hoursLabel}</span>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-right font-semibold text-muted-foreground">
                Inspector
              </span>
              <span className="col-span-1">{inspectorLabel}</span>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-right font-semibold text-muted-foreground">
                Date Reported
              </span>
              <span className="col-span-1">{dateReportedStr}</span>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-right font-semibold text-muted-foreground">
                Equipment ID
              </span>
              <span className="col-span-1">{equipmentLabel}</span>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-right font-semibold text-muted-foreground">
                Mine Site ID
              </span>
              <span className="col-span-1">{exam.mshaMineId || '—'}</span>
            </div>
          </div>

          {/* Full Defect Resolution Chain View */}
          {isDefectRecord ? (
            <div className="rounded-lg border border-primary/30 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Defect Resolution & Audit Chain
                </span>
                {isCorrected ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Corrected
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Open Defect
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 text-sm">
                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    1. Date Reported
                  </div>
                  <div className="font-medium mt-0.5">{dateReportedStr}</div>
                </div>

                <div className="flex justify-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90" />
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    2. Hazard Description
                  </div>
                  <div className="mt-0.5">{hazardDescription}</div>
                </div>

                <div className="flex justify-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90" />
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    3. Date Corrected
                  </div>
                  <div className="font-medium mt-0.5">{dateCorrectedStr}</div>
                </div>

                <div className="flex justify-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90" />
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    4. Corrective Action Taken
                  </div>
                  <div className="mt-0.5">{correctiveActionTaken}</div>
                </div>

                <div className="flex justify-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90" />
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    5. Resolved By
                  </div>
                  <div className="font-medium mt-0.5">{resolvedBy}</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                <span className="font-semibold text-muted-foreground">
                  Defects Found / Findings
                </span>
                <p className="rounded-md border bg-muted/50 p-3 text-sm">
                  {exam.defectDetails || exam.defectsFound || 'None'}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <span className="font-semibold text-muted-foreground">
                  Corrective Action
                </span>
                <p className="rounded-md border bg-muted/50 p-3 text-sm">
                  {exam.correctiveActionNotes ||
                    exam.correctiveAction ||
                    'No corrective action was required.'}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isOpenDefect && onLogCorrectiveAction && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onLogCorrectiveAction(exam);
              }}
            >
              <Wrench className="mr-2 h-4 w-4" />
              Log Corrective Action
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

