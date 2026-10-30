'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Camera,
  FileText,
  Upload,
  Loader2,
  Mail,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { useFirestore, useStorage } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  deleteStorageObject,
  formatUploadError,
  sanitizeStorageFileName,
  uploadFileResumable,
} from '@/lib/upload-document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
export interface ExamAttachmentRecord {
  id: string;
  companyId: string;
  mshaMineId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  area: string;
  notes: string;
  examinerName: string;
  storagePath?: string;
  createdAt: string;
}

interface SitePhotoAttachmentLogProps {
  selectedMineId?: string;
}

export function SitePhotoAttachmentLog({
  selectedMineId = '13-00123',
}: SitePhotoAttachmentLogProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const examinerName = user?.isAnonymous
    ? (profile?.fullName || 'Guest Supervisor')
    : (profile?.fullName || user?.displayName || 'Jed McGinnis');

  // Standalone Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [areaInput, setAreaInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [examinerInput, setExaminerInput] = useState<string>(profile?.fullName || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (profile?.fullName) {
      setExaminerInput(profile.fullName);
    } else if (user?.isAnonymous) {
      setExaminerInput('Guest Supervisor');
    } else if (user) {
      const fallbackName = profile?.fullName || user?.displayName || 'Jed McGinnis';
      setExaminerInput(fallbackName);
    }
  }, [profile, user]);

  // Recent Photos & Documents Gallery / List State
  const [attachments, setAttachments] = useState<ExamAttachmentRecord[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(true);

  // Subscribe in real-time to "exam_attachments" filtered by selectedMineId
  useEffect(() => {
    if (!firestore) return;

    setIsLoadingAttachments(true);

    // Query collection("exam_attachments") where("mshaMineId", "==", selectedMineId)
    const attachmentsQuery = query(
      collection(firestore, 'exam_attachments'),
      where('mshaMineId', '==', selectedMineId)
    );

    const unsubscribe = onSnapshot(
      attachmentsQuery,
      (snapshot) => {
        const records: ExamAttachmentRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            companyId: data.companyId || 'comp_test_001',
            mshaMineId: data.mshaMineId || selectedMineId,
            fileUrl: data.fileUrl || '',
            fileName: data.fileName || 'attachment',
            fileType: data.fileType || '',
            area: data.area || '—',
            notes: data.notes || '',
            examinerName: data.examinerName || '—',
            storagePath: data.storagePath || '',
            createdAt: data.createdAt || '',
          };
        });

        // Sort newest first in JavaScript so no composite index is required
        records.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setAttachments(records);
        setIsLoadingAttachments(false);
      },
      (error) => {
        console.error('Error retrieving exam attachments:', error);
        setIsLoadingAttachments(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedMineId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);

    // Show local thumbnail preview if the file is an image
    if (file && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Independent Upload Handler for standalone photo/PDF documentation
  const handleUploadAttachment = async (e: FormEvent) => {
    e.preventDefault();

    if (authLoading) {
      toast({
        title: 'Please wait',
        description: 'Sign-in is still finishing. Try the upload again in a moment.',
      });
      return;
    }

    if (!user) {
      console.error('Site attachment upload blocked: no authenticated user.');
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be signed in before uploading site photos.',
      });
      return;
    }

    if (!firestore || !storage) {
      console.error('Site attachment upload blocked: Firebase services are not ready.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase Storage or Firestore is not initialized.',
      });
      return;
    }

    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'File Required',
        description: 'Please capture a photo or select a PDF/image file first.',
      });
      return;
    }

    const resolvedExaminer =
      examinerInput.trim() ||
      (user?.isAnonymous
        ? profile?.fullName || 'Guest Supervisor'
        : profile?.fullName || user?.displayName || 'Jed McGinnis');

    if (!areaInput.trim() || !resolvedExaminer) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter the Area / Location and Taken By / Examiner name.',
      });
      return;
    }

    setIsUploading(true);

    const safeName = sanitizeStorageFileName(selectedFile.name);
    const mineSegment = selectedMineId.replace(/[^\w.\-]+/g, '_');
    const storagePath = `site_photos/${mineSegment}/${Date.now()}_${safeName}`;
    let stored = false;

    try {
      const { downloadUrl } = await uploadFileResumable(storage, storagePath, selectedFile);
      stored = true;

      const attachmentData = {
        companyId: profile?.companyId || 'comp_test_001',
        mshaMineId: selectedMineId,
        userId: user.uid,
        fileUrl: downloadUrl,
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/octet-stream',
        storagePath,
        area: areaInput.trim(),
        notes: notesInput.trim(),
        examinerName: resolvedExaminer,
        createdAt: new Date().toISOString(),
      };

      const attachmentsCollection = collection(firestore, 'exam_attachments');
      await addDoc(attachmentsCollection, attachmentData);

      toast({
        title: 'Attachment Logged',
        description: `Photo/document for "${areaInput.trim()}" has been uploaded.`,
      });

      // Step 6: Clear all inputs so the user can immediately snap and log another photo
      clearSelectedFile();
      setAreaInput('');
      setNotesInput('');
      setExaminerInput(
        user?.isAnonymous
          ? profile?.fullName || 'Guest Supervisor'
          : profile?.fullName || user?.displayName || 'Jed McGinnis'
      );
    } catch (error: unknown) {
      console.error('Error uploading and logging site attachment:', error);
      if (stored) {
        try {
          await deleteStorageObject(storage, storagePath);
        } catch (cleanupError) {
          console.error('Failed to remove orphaned site photo after Firestore write failed:', cleanupError);
        }
      }
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: formatUploadError(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Pre-populate mailto: link for sharing a site condition photo
  const handleEmailPhoto = (record: ExamAttachmentRecord) => {
    const subject = `MSHA Site Condition Photo - ${record.area} (${selectedMineId})`;
    const body = `Area: ${record.area}\nLogged By: ${record.examinerName}\nNotes: ${record.notes}\nDate: ${record.createdAt}\n\nView Attachment:\n${record.fileUrl}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Delete an attachment record from Firestore
  const handleDeleteAttachment = async (record: ExamAttachmentRecord) => {
    if (!firestore || !storage) return;
    try {
      await deleteStorageObject(storage, record.storagePath);
      const docRef = doc(firestore, 'exam_attachments', record.id);
      await deleteDoc(docRef);
      toast({
        title: 'Attachment Deleted',
        description: 'The site photo/document record has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting attachment record:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete attachment record.',
      });
    }
  };

  const isImageRecord = (record: ExamAttachmentRecord) => {
    if (record.fileType && record.fileType.startsWith('image/')) return true;
    if (record.fileName && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(record.fileName)) {
      return true;
    }
    return false;
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '—';
    const parsed = new Date(isoString);
    return isNaN(parsed.getTime()) ? isoString : parsed.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 1. Standalone "Log Site Photo / Condition Document" Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <CardTitle>Log Site Photo / Condition Document</CardTitle>
          </div>
          <CardDescription>
            Independently snap and upload site photos or PDF condition reports for mine site{' '}
            <strong>{selectedMineId}</strong>. You can log multiple photos one after another.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadAttachment} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="standalone-photo-input">
                  Photo or PDF Attachment (Camera or File)
                </Label>
                <input
                  ref={fileInputRef}
                  id="standalone-photo-input"
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                />
                {selectedFile && (
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-2.5 mt-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Selected preview"
                          className="h-12 w-12 rounded object-cover border shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {previewUrl ? 'Image ready to upload' : 'PDF ready to upload'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={clearSelectedFile}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear file</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment-area-input">Area / Location Description</Label>
                <Input
                  id="attachment-area-input"
                  placeholder="e.g., Primary Jaw Crusher Guard or Haul Road Berm Mile 2"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment-notes-input">Notes / Condition</Label>
                <Input
                  id="attachment-notes-input"
                  placeholder="e.g., Berm restored to mid-axle height or Shift inspection verification"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment-examiner-input">Taken By / Examiner</Label>
                <Input
                  id="attachment-examiner-input"
                  placeholder={examinerName}
                  value={examinerInput}
                  onChange={(e) => setExaminerInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to Storage...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Log Attachment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 3. "Recent Photos & Documents" Gallery / List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Photos & Documents</CardTitle>
          <CardDescription>
            Standalone site condition photos and PDF documentation logged for mine site{' '}
            <strong>{selectedMineId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Area / Location</TableHead>
                <TableHead>Examiner</TableHead>
                <TableHead className="hidden md:table-cell">Notes / Condition</TableHead>
                <TableHead className="hidden md:table-cell">Date / Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAttachments && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading site photos & documents...
                  </TableCell>
                </TableRow>
              )}
              {!isLoadingAttachments && attachments.length > 0 ? (
                attachments.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <a
                        href={record.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                        title="Click to open attachment in new tab"
                      >
                        {isImageRecord(record) ? (
                          <img
                            src={record.fileUrl}
                            alt={record.area}
                            className="h-12 w-12 rounded object-cover border shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border bg-primary/10 text-primary">
                            <FileText className="h-6 w-6" />
                          </div>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="font-medium">{record.area}</TableCell>
                    <TableCell>{record.examinerName}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {record.notes || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDateTime(record.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEmailPhoto(record)}
                        >
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          Email Photo
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteAttachment(record)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoadingAttachments && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No standalone site photos or documents logged for this mine site yet.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{attachments.length}</strong> of{' '}
            <strong>{attachments.length}</strong> logged attachments
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
