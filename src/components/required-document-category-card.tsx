'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Eye,
  Trash2,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
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
import { getNextQuarterlyReportDeadline } from '@/lib/msha-quarterly-deadline';

export interface RequiredDocRecord {
  id: string;
  companyId: string;
  mshaMineId: string;
  category: string;
  documentTitle: string;
  fileName: string;
  fileUrl?: string;
  storagePath?: string;
  date: string;
  createdAt: string;
}

interface RequiredDocumentCategoryCardProps {
  categoryName: string;
  description: string;
  icon: LucideIcon;
  selectedMineId: string;
  documents: RequiredDocRecord[];
  isLoading: boolean;
  onViewDocument: (doc: RequiredDocRecord) => void;
}

export function RequiredDocumentCategoryCard({
  categoryName,
  description,
  icon: Icon,
  selectedMineId,
  documents,
  isLoading,
  onViewDocument,
}: RequiredDocumentCategoryCardProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isQuarterlyReportsCard = categoryName === 'Quarterly Reports';
  const quarterlyStatus = isQuarterlyReportsCard
    ? getNextQuarterlyReportDeadline(documents)
    : null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [titleInput, setTitleInput] = useState('');
  const [dateInput, setDateInput] = useState(todayStr);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileInput(file);
  };

  const handleAddDocument = async (e: FormEvent) => {
    e.preventDefault();

    if (authLoading) {
      toast({
        title: 'Please wait',
        description: 'Sign-in is still finishing. Try the upload again in a moment.',
      });
      return;
    }

    if (!user) {
      console.error('Required document upload blocked: no authenticated user.');
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be signed in before uploading documents.',
      });
      return;
    }

    if (!firestore || !storage) {
      console.error('Required document upload blocked: Firebase services are not ready.');
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
        description: isQuarterlyReportsCard
          ? 'Please enter a Report Title / Quarter Name.'
          : 'Please enter a document title.',
      });
      return;
    }

    if (!fileInput) {
      toast({
        variant: 'destructive',
        title: 'File Required',
        description: 'Choose a PDF or image to upload.',
      });
      return;
    }

    setIsSubmitting(true);

    const submissionDateValue = dateInput || new Date().toISOString().split('T')[0];

    try {
      await uploadDocumentRecord({
        storage,
        firestore,
        collectionName: 'required_documents',
        folder: categoryName,
        file: fileInput,
        userId: user.uid,
        type: categoryName,
        category: categoryName,
        companyId: profile?.companyId || 'comp_test_001',
        mshaMineId: selectedMineId,
        documentTitle: titleInput.trim(),
        date: submissionDateValue,
      });
      toast({
        title: isQuarterlyReportsCard ? 'Report Uploaded' : 'Document Added',
        description: `"${titleInput.trim()}" saved to ${categoryName}.`,
      });
      setTitleInput('');
      setDateInput(new Date().toISOString().split('T')[0]);
      setFileInput(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      console.error(`Error uploading document to ${categoryName}:`, error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: formatUploadError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (docItem: RequiredDocRecord) => {
    if (!firestore || !storage) return;
    const docRef = doc(firestore, 'required_documents', docItem.id);
    try {
      await deleteStorageObject(storage, docItem.storagePath);
      await deleteDoc(docRef);
      toast({
        title: 'Deleted',
        description: `"${docItem.documentTitle}" has been removed from ${categoryName}.`,
      });
    } catch (error: unknown) {
      console.error(`Error deleting document ${docItem.id} from ${categoryName}:`, error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: formatUploadError(error),
      });
    }
  };

  const formatDateDisplay = (rawDate: string) => {
    if (!rawDate) return '—';
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? rawDate : parsed.toLocaleDateString();
  };

  return (
    <Card
      id={isQuarterlyReportsCard ? 'quarterly-reports-card' : undefined}
      className="flex flex-col justify-between border shadow-sm scroll-mt-20"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <CardTitle className="text-base leading-tight">{categoryName}</CardTitle>
                {isQuarterlyReportsCard && quarterlyStatus && (
                  <>
                    {quarterlyStatus.isFiled ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[11px] px-1.5 py-0 h-5"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Filed / Complete
                      </Badge>
                    ) : quarterlyStatus.daysRemaining < 0 ? (
                      <Badge variant="destructive" className="text-[11px] px-1.5 py-0 h-5">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        OVERDUE
                      </Badge>
                    ) : quarterlyStatus.daysRemaining <= 15 ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[11px] px-1.5 py-0 h-5"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Due in {quarterlyStatus.daysRemaining} Days
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[11px] px-1.5 py-0 h-5"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Due in {quarterlyStatus.daysRemaining} Days
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
        {/* Upload Form - Always visible for Quarterly Reports */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isQuarterlyReportsCard ? 'Upload Quarterly Report' : 'Add Document'}
            </span>
            {!isQuarterlyReportsCard && (
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
            )}
          </div>

          {(isQuarterlyReportsCard || isFormExpanded) && (
            <form onSubmit={handleAddDocument} className="space-y-2.5">
              {isQuarterlyReportsCard ? (
                <>
                  <div>
                    <Label
                      htmlFor={`title-${categoryName}`}
                      className="text-xs text-muted-foreground"
                    >
                      Report Title / Quarter Name
                    </Label>
                    <Input
                      id={`title-${categoryName}`}
                      placeholder="e.g., Q3 2026 Form 7000-2"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`date-${categoryName}`}
                      className="text-xs text-muted-foreground"
                    >
                      Submission Date
                    </Label>
                    <Input
                      id={`date-${categoryName}`}
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`file-${categoryName}`}
                      className="text-xs text-muted-foreground"
                    >
                      File Attachment
                    </Label>
                    <input
                      ref={fileInputRef}
                      id={`file-${categoryName}`}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={isSubmitting}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting ? 'Uploading...' : 'Upload Report'}
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor={`title-${categoryName}`} className="sr-only">
                      Document Title
                    </Label>
                    <Input
                      id={`title-${categoryName}`}
                      placeholder="Document title (e.g., 2026 Plan)"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`date-${categoryName}`} className="sr-only">
                        Date
                      </Label>
                      <div className="relative">
                        <Input
                          id={`date-${categoryName}`}
                          type="date"
                          value={dateInput}
                          onChange={(e) => setDateInput(e.target.value)}
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`file-${categoryName}`} className="sr-only">
                        File Attachment
                      </Label>
                      <Input
                        ref={fileInputRef}
                        id={`file-${categoryName}`}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="h-8 text-xs cursor-pointer file:text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={isSubmitting}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting ? 'Saving...' : 'Add Document'}
                  </Button>
                </>
              )}
            </form>
          )}
        </div>

        {/* Document History List */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {isQuarterlyReportsCard
              ? `Uploaded Quarterly Reports (${documents.length})`
              : `Saved Documents (${documents.length})`}
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              Loading documents...
            </p>
          ) : documents.length > 0 ? (
            <ul className="divide-y rounded-md border bg-background max-h-52 overflow-y-auto">
              {documents.map((docItem) => (
                <li
                  key={docItem.id}
                  className="flex items-center justify-between gap-2 p-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate" title={docItem.documentTitle}>
                      {docItem.documentTitle}
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <CalendarIcon className="h-3 w-3" />
                        {isQuarterlyReportsCard ? 'Submitted: ' : ''}
                        {formatDateDisplay(docItem.date || docItem.createdAt)}
                      </span>
                      {docItem.fileName && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <FileText className="h-3 w-3 shrink-0" />
                            {docItem.fileName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onViewDocument(docItem)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(docItem)}
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
              {isQuarterlyReportsCard
                ? 'No quarterly reports uploaded for this mine site.'
                : 'No documents uploaded for this category.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

