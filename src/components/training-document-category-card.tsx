'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Plus,
  Eye,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Upload,
  ChevronDown,
  ChevronUp,
  LucideIcon,
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useStorage } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  deleteStorageObject,
  formatUploadError,
  uploadDocumentRecord,
} from '@/lib/upload-document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
export interface TrainingDocRecord {
  id: string;
  companyId: string;
  mshaMineId: string;
  category: string;
  documentTitle: string;
  minerName: string;
  completionDate: string;
  expirationDate: string | null;
  fileName: string;
  fileUrl?: string;
  storagePath?: string;
  createdAt: string;
}

interface TrainingDocumentCategoryCardProps {
  categoryName: string;
  description: string;
  icon: LucideIcon;
  selectedMineId: string;
  records: TrainingDocRecord[];
  isLoading: boolean;
  isPlanCard?: boolean;
  onViewRecord: (record: TrainingDocRecord) => void;
}

export function TrainingDocumentCategoryCard({
  categoryName,
  description,
  icon: Icon,
  selectedMineId,
  records,
  isLoading,
  isPlanCard = false,
  onViewRecord,
}: TrainingDocumentCategoryCardProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const isTrainingPlan =
    isPlanCard || categoryName.toLowerCase().includes('approved training plan');

  const todayStr = new Date().toISOString().split('T')[0];
  const [titleInput, setTitleInput] = useState('');
  const [minerNameInput, setMinerNameInput] = useState('');
  const [completionDateInput, setCompletionDateInput] = useState(todayStr);
  const [expirationDateInput, setExpirationDateInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileInput(file);
  };

  const handleSaveRecord = async (e: FormEvent) => {
    e.preventDefault();

    if (authLoading) {
      toast({
        title: 'Please wait',
        description: 'Sign-in is still finishing. Try the upload again in a moment.',
      });
      return;
    }

    if (!user) {
      console.error('Training document upload blocked: no authenticated user.');
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be signed in before uploading training documents.',
      });
      return;
    }

    if (!firestore || !storage) {
      console.error('Training document upload blocked: Firebase services are not ready.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase Storage or Firestore is not available.',
      });
      return;
    }

    if (!titleInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Title',
        description: isTrainingPlan
          ? 'Please enter a Plan Title / Version.'
          : 'Please enter a Document Title / Course Name.',
      });
      return;
    }

    if (!fileInput) {
      toast({
        variant: 'destructive',
        title: 'File Required',
        description: 'Choose a certificate or training plan file to upload.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await uploadDocumentRecord({
        storage,
        firestore,
        collectionName: 'training_documents',
        folder: categoryName,
        file: fileInput,
        userId: user.uid,
        type: categoryName,
        category: categoryName,
        companyId: profile?.companyId || 'comp_test_001',
        mshaMineId: selectedMineId,
        documentTitle: titleInput.trim(),
        minerName: isTrainingPlan ? '' : minerNameInput.trim(),
        completionDate: completionDateInput || todayStr,
        expirationDate: isTrainingPlan ? null : expirationDateInput || null,
        date: completionDateInput || todayStr,
      });
      toast({
        title: isTrainingPlan ? 'Plan Uploaded' : 'Record Saved',
        description: `"${titleInput.trim()}" saved under ${categoryName}.`,
      });
      setTitleInput('');
      setMinerNameInput('');
      setCompletionDateInput(new Date().toISOString().split('T')[0]);
      setExpirationDateInput('');
      setFileInput(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      console.error(`Error uploading training record to ${categoryName}:`, error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: formatUploadError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (record: TrainingDocRecord) => {
    if (!firestore || !storage) return;
    const docRef = doc(firestore, 'training_documents', record.id);
    try {
      await deleteDoc(docRef);
    } catch (error: unknown) {
      console.error(`Error deleting training record ${record.id} from ${categoryName}:`, error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: formatUploadError(error),
      });
      return;
    }

    try {
      await deleteStorageObject(storage, record.storagePath);
    } catch (error: unknown) {
      console.error(
        `Storage file for training record ${record.id} could not be deleted after the record was removed:`,
        error,
      );
    }

    toast({
      title: 'Deleted',
      description: `"${record.documentTitle}" has been removed from ${categoryName}.`,
    });
  };

  const formatDateDisplay = (rawDate: string | null) => {
    if (!rawDate) return '—';
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? rawDate : parsed.toLocaleDateString();
  };

  return (
    <Card className="flex flex-col justify-between border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base leading-tight">{categoryName}</CardTitle>
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
        {/* Compact Inline Form */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isTrainingPlan ? 'Upload Training Plan' : 'Add Record / Certificate'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsFormExpanded(!isFormExpanded)}
            >
              {isFormExpanded ? (
                <>
                  Hide <ChevronUp className="ml-1 h-3 w-3" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          </div>

          {isFormExpanded && (
            <form onSubmit={handleSaveRecord} className="space-y-2.5">
              <div>
                <Label htmlFor={`title-${categoryName}`} className="text-xs text-muted-foreground">
                  {isTrainingPlan ? 'Plan Title / Version' : 'Document Title / Course Name'}
                </Label>
                <Input
                  id={`title-${categoryName}`}
                  placeholder={
                    isTrainingPlan
                      ? 'e.g., Part 46 Training Plan v2.1'
                      : 'e.g., 5000-23 Certificate'
                  }
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              {!isTrainingPlan && (
                <div>
                  <Label htmlFor={`miner-${categoryName}`} className="text-xs text-muted-foreground">
                    Miner / Trainee Name
                  </Label>
                  <Input
                    id={`miner-${categoryName}`}
                    placeholder="e.g., John Smith"
                    value={minerNameInput}
                    onChange={(e) => setMinerNameInput(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              )}

              {isTrainingPlan ? (
                <div>
                  <Label
                    htmlFor={`completion-${categoryName}`}
                    className="text-xs text-muted-foreground"
                  >
                    Effective / Approval Date
                  </Label>
                  <Input
                    id={`completion-${categoryName}`}
                    type="date"
                    value={completionDateInput}
                    onChange={(e) => setCompletionDateInput(e.target.value)}
                    className="h-8 text-xs mt-1"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label
                      htmlFor={`completion-${categoryName}`}
                      className="text-xs text-muted-foreground"
                    >
                      Completion / Effective Date
                    </Label>
                    <Input
                      id={`completion-${categoryName}`}
                      type="date"
                      value={completionDateInput}
                      onChange={(e) => setCompletionDateInput(e.target.value)}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`expiration-${categoryName}`}
                      className="text-xs text-muted-foreground"
                    >
                      Expiration / Due Date (optional)
                    </Label>
                    <Input
                      id={`expiration-${categoryName}`}
                      type="date"
                      value={expirationDateInput}
                      onChange={(e) => setExpirationDateInput(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor={`file-${categoryName}`} className="text-xs text-muted-foreground">
                  File Attachment
                </Label>
                <Input
                  ref={fileInputRef}
                  id={`file-${categoryName}`}
                  type="file"
                  onChange={handleFileChange}
                  className="h-8 text-xs cursor-pointer file:text-xs mt-1"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs"
                disabled={isSubmitting}
              >
                {isTrainingPlan ? (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting ? 'Uploading...' : 'Upload Plan'}
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting ? 'Saving...' : 'Save Record'}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Category-specific Training Records List */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Saved {isTrainingPlan ? 'Plans' : 'Records'} ({records.length})
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              Loading training records...
            </p>
          ) : records.length > 0 ? (
            <ul className="divide-y rounded-md border bg-background max-h-56 overflow-y-auto">
              {records.map((rec) => (
                <li
                  key={rec.id}
                  className="flex items-center justify-between gap-2 p-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium truncate" title={rec.documentTitle}>
                      {rec.documentTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                      {!isTrainingPlan && (
                        <>
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                            <User className="h-3 w-3 shrink-0" />
                            {rec.minerName || 'Unassigned Miner'}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDateDisplay(rec.completionDate || rec.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onViewRecord(rec)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(rec)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No {isTrainingPlan ? 'training plans' : 'records'} uploaded for this category.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
