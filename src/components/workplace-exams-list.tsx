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
  Trash2,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Loader2,
  Calendar as CalendarIcon,
  Download,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkplaceExamDetailsDialog } from './workplace-exam-details-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatSubmittedDate } from '@/lib/format-calendar-date';
import { isExamPastRetention } from '@/lib/retention';

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

interface WorkplaceExamsListProps {
  selectedMineId?: string;
}

export function WorkplaceExamsList({
  selectedMineId = '13-00123',
}: WorkplaceExamsListProps) {
  const { user } = useUser();
  const { profile } = useAuth();
  const firestore = useFirestore();
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

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
      collection(activeDb, 'workplace_exams'),
      where('mshaMineId', '==', selectedMineId),
      where('companyId', '==', profile?.companyId || 'comp_test_001')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedDocs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort results in JavaScript by date descending
        fetchedDocs.sort((a: any, b: any) => {
          const timeA = a.examDate?.toDate
            ? a.examDate.toDate().getTime()
            : new Date(a.date || a.examDate || a.createdAt || 0).getTime();
          const timeB = b.examDate?.toDate
            ? b.examDate.toDate().getTime()
            : new Date(b.date || b.examDate || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const expired = fetchedDocs.filter((exam: any) => isExamPastRetention(exam));
        const kept = fetchedDocs.filter((exam: any) => !isExamPastRetention(exam));
        expired.forEach((exam: any) => {
          deleteDoc(doc(activeDb, 'workplace_exams', exam.id)).catch((err) => {
            console.error('Failed to delete expired workplace exam:', exam.id, err);
          });
        });
        setExams(kept);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error retrieving workplace exams:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedMineId]);

  useEffect(() => {
    if (selectedDocumentId && !exams.some((exam) => exam.id === selectedDocumentId)) {
      setSelectedDocumentId('');
    }
  }, [exams, selectedDocumentId]);

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
      exam.safetyStatus || exam.status || 'safe'
    ).toLowerCase();

    return (
      isExamCorrected(exam) ||
      rawStatus === 'open' ||
      rawStatus === 'under repair' ||
      rawStatus.includes('defect') ||
      rawSafetyStatus === 'at_risk' ||
      rawSafetyStatus === 'unsafe' ||
      rawSafetyStatus.includes('defect')
    );
  };


  const openDefects = exams.filter((exam: any) => {
    if (isExamCorrected(exam)) return false;
    const rawStatus = String(exam.status || '').toLowerCase();
    const rawSafetyStatus = String(exam.safetyStatus || exam.status || '').toLowerCase();
    return (
      rawStatus === 'open' ||
      rawStatus === 'under repair' ||
      rawStatus.includes('defect') ||
      rawSafetyStatus === 'at_risk' ||
      rawSafetyStatus === 'unsafe' ||
      rawSafetyStatus.includes('defect')
    );
  });

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


  const exportToCSV = () => {
    if (!exams.length) {
      toast({
        title: 'No Data',
        description: 'There are no workplace exams to export.',
      });
      return;
    }

    const headers = [
      'Exam ID',
      'Mine ID',
      'Area',
      'Inspector',
      'Exam Date',
      'Status',
      'Safety Status',
      'Findings',
      'Corrective Action',
      'Corrected By',
      'Corrected At',
      'Created At',
    ];

    const rows = exams.map((exam) => {
      const dateStr = getExamDateString(exam);
      const correctedAt = exam.correctedAt
        ? new Date(exam.correctedAt).toLocaleString()
        : '';
      const createdAt = exam.createdAt
        ? new Date(exam.createdAt).toLocaleString()
        : '';

      return [
        exam.id || '',
        exam.mshaMineId || selectedMineId || '',
        exam.area || '',
        exam.inspector || exam.inspectorName || '',
        dateStr,
        exam.status || '',
        exam.safetyStatus || '',
        (exam.findings || '').replace(/\n/g, ' '),
        (exam.correctiveActionNotes || exam.correctiveAction || '').replace(/\n/g, ' '),
        exam.correctedByName || '',
        correctedAt,
        createdAt,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workplace-exams-${selectedMineId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV Exported',
      description: `${exams.length} workplace exam(s) downloaded.`,
    });
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
      await updateDoc(doc(activeDb, 'workplace_exams', correctiveExam.id), {
        status: 'Corrected',
        correctiveActionNotes,
        correctedByName,
        correctedAt,
        correctiveAction: correctiveActionNotes,
        correctiveActionType: actionType,
      });

      toast({
        title: 'Corrective Action Logged',
        description: `Defect at ${correctiveExam.area} has been marked as Corrected.`,
      });

      setIsCorrectiveModalOpen(false);
      setCorrectiveExam(null);
    } catch (error: any) {
      console.error('Error updating corrective action in workplace_exams:', error);
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
    const areaLabel = exam.area;
    const subject = `Safety Report for ${areaLabel}`;
    const body = `Hello,

This is a safety report regarding a recent workplace examination.

Area: ${areaLabel}
Inspector: ${exam.inspector || exam.inspectorName || '—'}
Date: ${getExamDateString(exam)}
Status: ${exam.status || exam.safetyStatus || 'safe'}

Findings:
${exam.findings}

Corrective Action Taken:
${exam.correctiveActionNotes || exam.correctiveAction || 'None'}

Resolved By: ${exam.correctedByName || '—'}
Date Corrected: ${
      exam.correctedAt ? new Date(exam.correctedAt).toLocaleString() : '—'
    }

Attachment Link: ${exam.fileUrl || 'None'}

Please review and take any necessary further action.

Regards,
${profile?.fullName || user?.displayName || 'MineMatey User'}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleDeleteExam = async (examId: string) => {
    const activeDb = firestore || db;
    if (!activeDb) return;
    const examDocRef = doc(activeDb, 'workplace_exams', examId);
    try {
      await deleteDoc(examDocRef);
      setSelectedDocumentId((current) => (current === examId ? '' : current));
      toast({
        title: 'Deleted',
        description: 'The workplace exam has been deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting workplace exam:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete exam. Please try again.',
      });
    }
  };

  const handleViewExam = (exam: any) => {
    setSelectedExam(exam);
    setIsDialogOpen(true);
  };

  const selectedDocument =
    exams.find((exam) => exam.id === selectedDocumentId) ?? null;
  const selectPlaceholder = `Select a document (${exams.length})`;
  const selectedTitle = selectedDocument?.area?.trim() || 'Workplace Exam';
  const selectedDefect = selectedDocument ? isExamDefect(selectedDocument) : false;
  const selectedCorrected = selectedDocument ? isExamCorrected(selectedDocument) : false;
  const selectedSafety = String(
    selectedDocument?.safetyStatus || selectedDocument?.status || 'safe'
  );

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle>Uncorrected Defects</CardTitle>
          <CardDescription>
            Workplace defects stay listed here until they are marked corrected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-4 text-center text-sm">Loading defects...</p>
          ) : openDefects.length > 0 ? (
            <div className="space-y-2">
              {openDefects.map((exam: any) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedDocumentId(exam.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{exam.area?.trim() || 'Workplace Exam'}</span>
                    <span className="block truncate text-xs text-muted-foreground">{exam.findings || exam.defectDetails || 'Open defect'}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{getExamDateString(exam)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No uncorrected workplace defects.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Workplace Exams</CardTitle>
          <CardDescription>
            A log of recently submitted workplace safety examinations and defect resolution status. Records and related photos older than 24 months are removed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm">Loading exams...</p>
          ) : exams.length > 0 ? (
            <div className="min-w-0 space-y-2">
              <Select
                key={selectedDocumentId ? 'selected' : 'empty'}
                value={selectedDocumentId || undefined}
                onValueChange={setSelectedDocumentId}
              >
                <SelectTrigger
                  className="h-8 w-full min-w-0 text-xs"
                  aria-label={selectPlaceholder}
                >
                  <SelectValue placeholder={selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => {
                    const title = exam.area?.trim() || 'Workplace Exam';
                    const submitted = formatSubmittedDate(exam.createdAt);
                    return (
                      <SelectItem key={exam.id} value={exam.id} className="text-xs">
                        {submitted ? `${title} - ${submitted}` : title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedDocument && (
                <div className="flex min-w-0 flex-col gap-2 rounded-md border bg-background p-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1 sm:flex-1">
                    <p className="font-medium truncate" title={selectedTitle}>
                      {selectedDocument.fileUrl ? (
                        <a
                          href={selectedDocument.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {selectedTitle}
                        </a>
                      ) : (
                        selectedTitle
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <CalendarIcon className="h-3 w-3" />
                        Submitted: {formatSubmittedDate(selectedDocument.createdAt) || '—'}
                      </span>
                      {selectedDocument.fileName && (
                        <>
                          <span>•</span>
                          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{selectedDocument.fileName}</span>
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!selectedDefect ? (
                        <Badge variant="secondary">Safe</Badge>
                      ) : (
                        <>
                          <Badge variant="destructive" className="capitalize">
                            {selectedSafety === 'Open' || selectedSafety === 'Corrected'
                              ? 'Defects Found'
                              : selectedSafety.replace('_', ' ')}
                          </Badge>
                          {selectedCorrected ? (
                            <button
                              type="button"
                              onClick={() => handleViewExam(selectedDocument)}
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
                  </div>

                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {selectedDefect && !selectedCorrected && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => openLogCorrectiveModal(selectedDocument)}
                      >
                        <Wrench className="mr-1 h-3.5 w-3.5" />
                        Log Corrective Action
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleViewExam(selectedDocument)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleEmailReport(selectedDocument)}
                    >
                      <Mail className="h-3.5 w-3.5 mr-1" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExam(selectedDocument.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-sm">No workplace exams found.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{exams?.length || 0}</strong> of{' '}
            <strong>{exams?.length || 0}</strong> exams
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!exams.length || isLoading}
            onClick={exportToCSV}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
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
              Document the hazard abatement or corrective action for{' '}
              <strong>{correctiveExam?.area || 'Workplace Area'}</strong>.
            </DialogDescription>
          </DialogHeader>

          {correctiveExam && (
            <form onSubmit={handleSaveCorrectiveAction} className="space-y-4 py-2">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-amber-400">
                    Original Reported Hazard / Defect
                  </span>
                  <span>Date Reported: {getExamDateString(correctiveExam)}</span>
                </div>
                <p className="font-medium text-foreground">
                  {correctiveExam.findings || 'Hazard identified during examination'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wp-corrective-action-type">Action Type</Label>
                <select
                  id="wp-corrective-action-type"
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
                <Label htmlFor="wp-corrective-description">
                  Corrective Action Description *
                </Label>
                <Textarea
                  id="wp-corrective-description"
                  rows={4}
                  placeholder="Describe the repair, abatement, or barricade measures completed..."
                  value={correctiveDescription}
                  onChange={(e) => setCorrectiveDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wp-resolved-by">Resolved By</Label>
                  <Input
                    id="wp-resolved-by"
                    type="text"
                    value={resolvedByInput}
                    onChange={(e) => setResolvedByInput(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wp-corrected-at">Date/Time of Correction</Label>
                  <Input
                    id="wp-corrected-at"
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
        <WorkplaceExamDetailsDialog
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

