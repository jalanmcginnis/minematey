'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useUser, useFirestore, db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail,
  MoreHorizontal,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EquipmentExamDetailsDialog } from './equipment-exam-details-dialog';
import { useToast } from '@/hooks/use-toast';

const ACTION_TYPE_OPTIONS = [
  'Hazard Abated / Repaired',
  'Barricaded & Tagged Out',
  'Work Suspended / Area Cleared',
] as const;

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface EquipmentExamsListProps {
  selectedMineId?: string;
}

export function EquipmentExamsList({
  selectedMineId = '13-00123',
}: EquipmentExamsListProps) {
  const { user } = useUser();
  const { profile } = useAuth();
  const firestore = useFirestore();
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Corrective Action Modal State
  const [correctiveExam, setCorrectiveExam] = useState<any | null>(null);
  const [isCorrectiveModalOpen, setIsCorrectiveModalOpen] = useState(false);
  const [actionType, setActionType] = useState<string>(ACTION_TYPE_OPTIONS[0]);
  const [correctiveDescription, setCorrectiveDescription] = useState<string>('');
  const [resolvedByInput, setResolvedByInput] = useState<string>(
    profile?.fullName || 'Supervisor'
  );
  const [correctedAtInput, setCorrectedAtInput] = useState<string>(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [isSavingCorrection, setIsSavingCorrection] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    if (profile?.fullName) {
      setResolvedByInput(profile.fullName);
    }
  }, [profile?.fullName]);

  useEffect(() => {
    const activeDb = firestore || db;
    if (!activeDb) return;

    setIsLoading(true);

    const q = query(
      collection(activeDb, 'equipment_exams'),
      where('mshaMineId', '==', selectedMineId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedDocs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort results in JavaScript by date descending (no Firestore composite index)
        fetchedDocs.sort((a: any, b: any) => {
          const timeA = a.examDate?.toDate
            ? a.examDate.toDate().getTime()
            : new Date(a.date || a.examDate || a.createdAt || 0).getTime();
          const timeB = b.examDate?.toDate
            ? b.examDate.toDate().getTime()
            : new Date(b.date || b.examDate || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setExams(fetchedDocs);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error retrieving equipment exams:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedMineId]);

  const isExamCorrected = (exam: any) => {
    const rawStatus = String(exam.status || '').toLowerCase();
    return (
      rawStatus === 'corrected' ||
      Boolean(
        exam.correctedAt && (exam.correctiveActionNotes || exam.correctiveAction)
      )
    );
  };

  const isExamDefect = (exam: any) => {
    const rawStatus = String(exam.status || '').toLowerCase();
    const rawSafetyStatus = String(
      exam.safetyStatus || exam.status || 'Safe to Operate'
    ).toLowerCase();
    const defectText = String(
      exam.defectDetails || exam.defectsFound || ''
    ).trim();

    return (
      isExamCorrected(exam) ||
      rawStatus === 'open' ||
      rawStatus === 'under repair' ||
      rawStatus.includes('defect') ||
      rawSafetyStatus.includes('defect') ||
      rawSafetyStatus.includes('red') ||
      rawSafetyStatus === 'needs_repair' ||
      rawSafetyStatus === 'out_of_service' ||
      (defectText.length > 0 && defectText.toLowerCase() !== 'none')
    );
  };

  const getExamDateString = (exam: any) => {
    if (exam.examDate?.toDate) {
      return exam.examDate.toDate().toLocaleDateString();
    }
    if (exam.date) {
      return new Date(exam.date).toLocaleDateString();
    }
    if (exam.examDate) {
      return new Date(exam.examDate).toLocaleDateString();
    }
    if (exam.createdAt) {
      return new Date(exam.createdAt).toLocaleDateString();
    }
    return '—';
  };

  const openLogCorrectiveModal = (exam: any) => {
    setCorrectiveExam(exam);
    setActionType(ACTION_TYPE_OPTIONS[0]);
    setCorrectiveDescription(
      exam.correctiveActionNotes || exam.correctiveAction || ''
    );
    setResolvedByInput(profile?.fullName || 'Supervisor');
    setCorrectedAtInput(toLocalDateTimeInputValue(new Date()));
    setIsCorrectiveModalOpen(true);
  };

  const handleSaveCorrectiveAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!correctiveExam) return;

    const descriptionTrimmed = correctiveDescription.trim();
    if (!descriptionTrimmed) {
      toast({
        variant: 'destructive',
        title: 'Description Required',
        description: 'Please enter a corrective action description.',
      });
      return;
    }

    const activeDb = firestore || db;
    if (!activeDb) return;

    const correctiveActionNotes = descriptionTrimmed.startsWith(`[${actionType}]`)
      ? descriptionTrimmed
      : `[${actionType}] ${descriptionTrimmed}`;
    const correctedByName =
      resolvedByInput.trim() || profile?.fullName || 'Supervisor';
    const parsedTime = correctedAtInput ? new Date(correctedAtInput) : new Date();
    const correctedAt = isNaN(parsedTime.getTime())
      ? new Date().toISOString()
      : parsedTime.toISOString();

    setIsSavingCorrection(true);
    try {
      await updateDoc(doc(activeDb, 'equipment_exams', correctiveExam.id), {
        status: 'Corrected',
        correctiveActionNotes,
        correctedByName,
        correctedAt,
        correctiveAction: correctiveActionNotes,
        correctiveActionType: actionType,
      });

      const equipmentLabel =
        correctiveExam.equipmentUnit ||
        correctiveExam.equipmentNumber ||
        correctiveExam.equipmentId ||
        'Equipment';

      toast({
        title: 'Corrective Action Logged',
        description: `Defect for ${equipmentLabel} has been marked as Corrected.`,
      });

      setIsCorrectiveModalOpen(false);
      setCorrectiveExam(null);
    } catch (error: any) {
      console.error('Error updating corrective action in equipment_exams:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description:
          error?.message || 'Could not save corrective action. Please try again.',
      });
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const handleEmailReport = (exam: any) => {
    const equipmentLabel =
      exam.equipmentUnit ||
      exam.equipmentNumber ||
      exam.equipmentId ||
      'Equipment';
    const subject = `Equipment Exam Report for ${equipmentLabel}`;
    const body = `Hello,

This is a report for a recent equipment examination.

Equipment ID: ${equipmentLabel}
Hour Meter Reading: ${exam.hourMeterReading ?? exam.operatingHours ?? '—'}
Inspector: ${exam.inspectorName || exam.inspector || exam.operator || '—'}
Date: ${getExamDateString(exam)}
Safety Status: ${exam.safetyStatus || exam.status || 'Safe to Operate'}

Defects Found / Details:
${exam.defectDetails || exam.defectsFound || 'None'}

Corrective Action Taken:
${exam.correctiveActionNotes || exam.correctiveAction || 'None'}

Resolved By: ${exam.correctedByName || '—'}
Date Corrected: ${
      exam.correctedAt ? new Date(exam.correctedAt).toLocaleString() : '—'
    }

Please review.

Regards,
${profile?.fullName || user?.displayName || 'MineMatey User'}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleDeleteExam = async (examId: string) => {
    const activeDb = firestore || db;
    if (!activeDb) return;
    const examDocRef = doc(activeDb, 'equipment_exams', examId);
    try {
      await deleteDoc(examDocRef);
      toast({
        title: 'Deleted',
        description: 'The equipment exam has been deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting equipment exam:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description:
          error.message || 'Could not delete the exam. Please try again.',
      });
    }
  };

  const handleViewExam = (exam: any) => {
    setSelectedExam(exam);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Equipment Exams</CardTitle>
          <CardDescription>
            A log of recently submitted equipment safety examinations and defect resolution status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment ID</TableHead>
                <TableHead>Hour Meter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Inspector</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading exams...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && exams && exams.length > 0 ? (
                exams.map((exam) => {
                  const defect = isExamDefect(exam);
                  const corrected = isExamCorrected(exam);
                  const rawSafety = String(
                    exam.safetyStatus || exam.status || 'Safe to Operate'
                  );

                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        {exam.equipmentUnit ||
                          exam.equipmentNumber ||
                          exam.equipmentId ||
                          '—'}
                      </TableCell>
                      <TableCell>
                        {exam.hourMeterReading ?? exam.operatingHours ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {!defect ? (
                            <Badge variant="secondary">Safe to Operate</Badge>
                          ) : (
                            <>
                              <Badge variant="destructive">
                                {rawSafety === 'Open' || rawSafety === 'Corrected'
                                  ? 'Defect Found - Red Tagged'
                                  : rawSafety}
                              </Badge>

                              {corrected ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewExam(exam)}
                                  title="Click to view full defect resolution chain"
                                  className="inline-flex items-center focus:outline-none"
                                >
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Corrected
                                  </Badge>
                                </button>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  Open Defect
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {exam.inspectorName || exam.inspector || exam.operator || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getExamDateString(exam)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {defect && !corrected && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => openLogCorrectiveModal(exam)}
                            >
                              <Wrench className="mr-1.5 h-3.5 w-3.5" />
                              Log Corrective Action
                            </Button>
                          )}

                          {defect && corrected && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-emerald-400 hover:text-emerald-300 text-xs"
                              onClick={() => handleViewExam(exam)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View Chain
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewExam(exam)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details & Chain
                              </DropdownMenuItem>
                              {defect && !corrected && (
                                <DropdownMenuItem
                                  onClick={() => openLogCorrectiveModal(exam)}
                                >
                                  <Wrench className="mr-2 h-4 w-4" />
                                  Log Corrective Action
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleEmailReport(exam)}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteExam(exam.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No equipment exams found for this mine site.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{exams?.length || 0}</strong> of{' '}
            <strong>{exams?.length || 0}</strong> exams
          </div>
        </CardFooter>
      </Card>

      {/* Log Corrective Action Modal */}
      <Dialog
        open={isCorrectiveModalOpen}
        onOpenChange={(open) => {
          setIsCorrectiveModalOpen(open);
          if (!open) setCorrectiveExam(null);
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Log Corrective Action</DialogTitle>
            <DialogDescription>
              Document the repair or corrective action for{' '}
              <strong>
                {correctiveExam?.equipmentUnit ||
                  correctiveExam?.equipmentNumber ||
                  correctiveExam?.equipmentId ||
                  'Equipment Unit'}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          {correctiveExam && (
            <form onSubmit={handleSaveCorrectiveAction} className="space-y-4 py-2">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-amber-400">
                    Original Reported Defect
                  </span>
                  <span>Date Reported: {getExamDateString(correctiveExam)}</span>
                </div>
                <p className="font-medium text-foreground">
                  {correctiveExam.defectDetails ||
                    correctiveExam.defectsFound ||
                    'Mechanical or safety defect identified'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eq-corrective-action-type">Action Type</Label>
                <select
                  id="eq-corrective-action-type"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eq-corrective-description">
                  Corrective Action Description *
                </Label>
                <Textarea
                  id="eq-corrective-description"
                  rows={4}
                  placeholder="Describe the repair, abatement, or tag-out measures completed..."
                  value={correctiveDescription}
                  onChange={(e) => setCorrectiveDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="eq-resolved-by">Resolved By</Label>
                  <Input
                    id="eq-resolved-by"
                    type="text"
                    value={resolvedByInput}
                    onChange={(e) => setResolvedByInput(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eq-corrected-at">Date/Time of Correction</Label>
                  <Input
                    id="eq-corrected-at"
                    type="datetime-local"
                    value={correctedAtInput}
                    onChange={(e) => setCorrectedAtInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCorrectiveModalOpen(false);
                    setCorrectiveExam(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingCorrection}>
                  {isSavingCorrection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save & Mark Corrected
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {selectedExam && (
        <EquipmentExamDetailsDialog
          exam={
            exams.find((e) => e.id === selectedExam.id) || selectedExam
          }
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onLogCorrectiveAction={openLogCorrectiveModal}
        />
      )}
    </>
  );
}

