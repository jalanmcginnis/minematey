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
export interface EquipmentAttachmentRecord {
  id: string;
  companyId: string;
  mshaMineId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  equipmentId: string;
  description: string;
  examinerName: string;
  storagePath?: string;
  createdAt: string;
}

interface EquipmentPhotoAttachmentLogProps {
  selectedMineId?: string;
}

export function EquipmentPhotoAttachmentLog({
  selectedMineId = '13-00123',
}: EquipmentPhotoAttachmentLogProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const resolvedExaminerName = profile?.fullName || user?.email || 'Examiner';

  // Standalone Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [equipmentIdInput, setEquipmentIdInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [examinerInput, setExaminerInput] = useState(resolvedExaminerName);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setExaminerInput((prev) => (!prev || prev === 'Examiner' ? resolvedExaminerName : prev));
  }, [resolvedExaminerName]);

  // Recent Equipment Photos & Documents State
  const [attachments, setAttachments] = useState<EquipmentAttachmentRecord[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(true);

  // Subscribe in real-time to "equipment_attachments" filtered by selectedMineId
  useEffect(() => {
    if (!firestore) return;

    setIsLoadingAttachments(true);

    // Query collection("equipment_attachments") where("mshaMineId", "==", selectedMineId)
    const attachmentsQuery = query(
      collection(firestore, 'equipment_attachments'),
      where('mshaMineId', '==', selectedMineId)
    );

    const unsubscribe = onSnapshot(
      attachmentsQuery,
      (snapshot) => {
        const records: EquipmentAttachmentRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            companyId: data.companyId || 'comp_test_001',
            mshaMineId: data.mshaMineId || selectedMineId,
            fileUrl: data.fileUrl || '',
            fileName: data.fileName || 'attachment',
            fileType: data.fileType || '',
            equipmentId: data.equipmentId || '—',
            description: data.description || '',
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
        console.error('Error retrieving equipment attachments:', error);
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

  // Independent Upload Handler for standalone equipment photo/PDF documentation
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
      console.error('Equipment attachment upload blocked: no authenticated user.');
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be signed in before uploading equipment photos.',
      });
      return;
    }

    if (!firestore || !storage) {
      console.error('Equipment attachment upload blocked: Firebase services are not ready.');
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
        description: 'Please select a photo or PDF file first.',
      });
      return;
    }

    if (!equipmentIdInput.trim() || !examinerInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please enter the Equipment ID / Unit # and Examiner / Mechanic Name.',
      });
      return;
    }

    setIsUploading(true);

    const safeName = sanitizeStorageFileName(selectedFile.name);
    const mineSegment = selectedMineId.replace(/[^\w.\-]+/g, '_');
    const storagePath = `equipment_photos/${mineSegment}/${Date.now()}_${safeName}`;
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
        equipmentId: equipmentIdInput.trim(),
        description: descriptionInput.trim(),
        examinerName: examinerInput.trim() || profile?.fullName || user?.email || 'Examiner',
        createdAt: new Date().toISOString(),
      };

      const attachmentsCollection = collection(firestore, 'equipment_attachments');
      await addDoc(attachmentsCollection, attachmentData);

      toast({
        title: 'Attachment Logged',
        description: `Equipment photo/document for "${equipmentIdInput.trim()}" has been uploaded.`,
      });

      // Step 6: Clear all inputs so another photo/file can be attached immediately
      clearSelectedFile();
      setEquipmentIdInput('');
      setDescriptionInput('');
      setExaminerInput(profile?.fullName || user?.email || 'Examiner');
    } catch (error: unknown) {
      console.error('Error uploading and logging equipment attachment:', error);
      if (stored) {
        try {
          await deleteStorageObject(storage, storagePath);
        } catch (cleanupError) {
          console.error('Failed to remove orphaned equipment photo after Firestore write failed:', cleanupError);
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

  // Pre-populate mailto: link for sharing an equipment defect/condition photo
  const handleEmailPhoto = (record: EquipmentAttachmentRecord) => {
    const subject = `Equipment Defect / Condition Photo - ${record.equipmentId} (${selectedMineId})`;
    const body = `Equipment Unit: ${record.equipmentId}\nReported By: ${record.examinerName}\nDescription: ${record.description}\nDate: ${record.createdAt}\n\nView Attachment:\n${record.fileUrl}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Delete an equipment attachment record from Firestore
  const handleDeleteAttachment = async (record: EquipmentAttachmentRecord) => {
    if (!firestore || !storage) return;
    try {
      await deleteStorageObject(storage, record.storagePath);
      const docRef = doc(firestore, 'equipment_attachments', record.id);
      await deleteDoc(docRef);
      toast({
        title: 'Attachment Deleted',
        description: 'The equipment photo/document record has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting equipment attachment record:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete equipment attachment record.',
      });
    }
  };

  const isImageRecord = (record: EquipmentAttachmentRecord) => {
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
      {/* 1. Dedicated "Log Equipment Photo / Defect Document" Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <CardTitle>Log Equipment Photo / Defect Document</CardTitle>
          </div>
          <CardDescription>
            Independently upload equipment defect photos or maintenance PDFs for mine site{' '}
            <strong>{selectedMineId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadAttachment} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="standalone-equipment-photo-input">
                  Photo or PDF Attachment (Camera or Stored File)
                </Label>
                <input
                  ref={fileInputRef}
                  id="standalone-equipment-photo-input"
                  type="file"
                  accept="image/*,application/pdf"
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
                <Label htmlFor="equipment-id-input">Equipment ID / Unit #</Label>
                <Input
                  id="equipment-id-input"
                  placeholder="e.g., CAT 980 Loader - Unit #4"
                  value={equipmentIdInput}
                  onChange={(e) => setEquipmentIdInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment-description-input">
                  Component / Defect Description
                </Label>
                <Input
                  id="equipment-description-input"
                  placeholder="e.g., Steering cylinder hydraulic leak or Tire sidewall cut"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment-examiner-input">Examiner / Mechanic Name</Label>
                <Input
                  id="equipment-examiner-input"
                  placeholder={resolvedExaminerName}
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

      {/* 3. "Recent Equipment Photos & Documents" Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Equipment Photos & Documents</CardTitle>
          <CardDescription>
            Standalone equipment defect photos and maintenance documents logged for mine site{' '}
            <strong>{selectedMineId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Equipment Unit #</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Examiner Name</TableHead>
                <TableHead className="hidden md:table-cell">Date / Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAttachments && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading equipment photos & documents...
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
                            alt={record.equipmentId}
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
                    <TableCell className="font-medium">{record.equipmentId}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {record.description || '—'}
                    </TableCell>
                    <TableCell>{record.examinerName}</TableCell>
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
                      No standalone equipment photos or documents logged for this mine site yet.
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
            <strong>{attachments.length}</strong> logged equipment attachments
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
