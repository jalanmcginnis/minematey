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
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
} from 'lucide-react';

interface WorkplaceExamDetailsDialogProps {
  exam: any;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLogCorrectiveAction?: (exam: any) => void;
}

export function WorkplaceExamDetailsDialog({
  exam,
  isOpen,
  onOpenChange,
  onLogCorrectiveAction,
}: WorkplaceExamDetailsDialogProps) {
  if (!exam) return null;

  const rawStatus = String(exam.status || '').trim();
  const rawSafetyStatus = String(exam.safetyStatus || exam.status || 'safe').trim();

  const isCorrected =
    rawStatus.toLowerCase() === 'corrected' ||
    Boolean(exam.correctedAt && (exam.correctiveActionNotes || exam.correctiveAction));

  const isDefectRecord =
    isCorrected ||
    rawStatus.toLowerCase() === 'open' ||
    rawStatus.toLowerCase() === 'under repair' ||
    rawStatus.toLowerCase().includes('defect') ||
    rawSafetyStatus.toLowerCase() === 'at_risk' ||
    rawSafetyStatus.toLowerCase() === 'unsafe' ||
    rawSafetyStatus.toLowerCase().includes('defect');

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

  const dateReportedStr = formatDateValue(
    exam.date || exam.examDate || exam.createdAt
  );
  const dateCorrectedStr = exam.correctedAt
    ? formatDateValue(exam.correctedAt)
    : 'Pending Correction';
  const hazardDescription =
    exam.findings || 'Hazard or adverse condition identified';
  const correctiveActionTaken =
    exam.correctiveActionNotes ||
    exam.correctiveAction ||
    'No corrective action recorded yet.';
  const resolvedBy = exam.correctedByName || '—';

  const isImageAttachment =
    exam.fileUrl &&
    ((exam.fileType && exam.fileType.startsWith('image/')) ||
      (exam.fileName && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(exam.fileName)));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workplace Exam & Defect Resolution Details</DialogTitle>
          <DialogDescription>
            Full report and corrective action chain for the examination conducted at{' '}
            <span className="font-semibold text-primary">{exam.area}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold text-muted-foreground">
              Status
            </span>
            <div className="col-span-3 flex flex-wrap items-center gap-2">
              {!isDefectRecord ? (
                <Badge variant="secondary">Safe</Badge>
              ) : (
                <>
                  <Badge variant="destructive" className="capitalize">
                    {rawSafetyStatus === 'Open' || rawSafetyStatus === 'Corrected'
                      ? 'Defects Found'
                      : rawSafetyStatus.replace('_', ' ')}
                  </Badge>
                  {isCorrected ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Corrected
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      Open Defect
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold text-muted-foreground">
              Inspector
            </span>
            <span className="col-span-3">
              {exam.inspector || exam.inspectorName || '—'}
            </span>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold text-muted-foreground">
              Date Reported
            </span>
            <span className="col-span-3">{dateReportedStr}</span>
          </div>

          {/* Full Defect Resolution Chain View */}
          {isDefectRecord && (
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
          )}

          {!isDefectRecord && (
            <>
              <div className="grid grid-cols-1 gap-2">
                <span className="font-semibold text-muted-foreground">Findings</span>
                <p className="rounded-md border bg-muted/50 p-3 text-sm">
                  {exam.findings}
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

          {exam.fileUrl && (
            <div className="grid grid-cols-1 gap-2">
              <span className="font-semibold text-muted-foreground">Attachment</span>
              <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isImageAttachment ? (
                    <a
                      href={exam.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={exam.fileUrl}
                        alt={exam.fileName || 'Exam attachment'}
                        className="h-16 w-16 rounded object-cover border"
                      />
                    </a>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {exam.fileName || 'Attached File'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exam.fileType || 'Document / Image'}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href={exam.fileUrl} target="_blank" rel="noopener noreferrer">
                    View Attachment
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
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

