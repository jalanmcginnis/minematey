'use client';

import { ChangeEvent, useState } from 'react';
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useActiveMine } from '@/context/MineContext';
import {
  collection,
  deleteDoc,
  doc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import {
  deleteStorageObject,
  formatUploadError,
  uploadDocumentRecord,
} from '@/lib/upload-document';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Download,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
interface DocumentUploadCardProps {
  documentType: string;
  title: string;
  description: string;
}

interface DocumentData {
  id: string;
  userId: string;
  documentName: string;
  type: string;
  fileUrl: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadDate: {
    toDate: () => Date;
  };
}

export function DocumentUploadCard({
  documentType,
  title,
  description,
}: DocumentUploadCardProps) {
  const { user, isUserLoading } = useUser();
  const { profile } = useAuth();
  const { selectedMineId } = useActiveMine();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const documentQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'required_documents'),
      where('type', '==', documentType),
      limit(1)
    );
  }, [user, firestore, documentType]);

  const { data: documents, isLoading } = useCollection<DocumentData>(documentQuery);
  const document = documents?.[0];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      handleUpload(file);
      event.target.value = '';
    }
  };

  const handleUpload = async (file: File) => {
    if (isUserLoading) {
      toast({
        title: 'Please wait',
        description: 'Sign-in is still finishing. Try the upload again in a moment.',
      });
      return;
    }

    if (!user || !storage || !firestore) {
      console.error('Document upload blocked: user or Firebase services are not ready.', { documentType });
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be signed in to upload documents.',
      });
      return;
    }

    if (document) {
      const removed = await handleDelete(false);
      if (!removed) return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      await uploadDocumentRecord({
        storage,
        firestore,
        collectionName: 'required_documents',
        folder: documentType,
        file,
        userId: user.uid,
        type: documentType,
        category: documentType,
        companyId: profile?.companyId || 'comp_test_001',
        mshaMineId: selectedMineId,
        onProgress: setProgress,
      });
      toast({
        title: 'Upload Successful',
        description: `"${file.name}" uploaded successfully.`,
      });
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const message = formatUploadError(err);
      setError(`Upload failed: ${message}`);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (showToast = true): Promise<boolean> => {
    if (!user || !firestore || !storage || !document) return false;

    const docRef = doc(firestore, 'required_documents', document.id);

    try {
      await deleteStorageObject(storage, document.storagePath);
    } catch (storageError: unknown) {
      console.error('Error deleting file from storage:', storageError);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: `Could not delete the file from storage: ${formatUploadError(storageError)}`,
      });
      return false;
    }

    try {
      await deleteDoc(docRef);
      if (showToast) {
        toast({
          title: 'Deleted',
          description: 'The document has been successfully deleted.',
        });
      }
      return true;
    } catch (dbError: unknown) {
      console.error('Error deleting document from Firestore:', dbError);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: formatUploadError(dbError),
      });
      return false;
    }
  };

  return (
    <Card className="bg-secondary">
      <CardHeader>
        <CardTitle className="text-secondary-foreground">{title}</CardTitle>
        <CardDescription className="text-secondary-foreground/80">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
            <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )}
        {!isLoading && document && (
            <div className="flex items-center justify-between p-3 rounded-md border bg-background/50">
                <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                    <span className="font-medium truncate" title={document.documentName}>{document.documentName}</span>
                </div>
                <div className='flex items-center gap-2'>
                    <Button asChild variant="outline" size="sm">
                        <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4"/> View
                        </a>
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete()}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                    </Button>
                </div>
            </div>
        )}
         {!isLoading && !document && !uploading && (
            <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md border-secondary-foreground/20">
                <p className="text-sm text-secondary-foreground/60">No document uploaded.</p>
            </div>
         )}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Uploading... {Math.round(progress)}%
            </p>
          </div>
        )}
        {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
      <CardFooter>
        <label htmlFor={`file-upload-${documentType}`} className="w-full">
            <Button asChild variant="secondary" disabled={uploading}>
                <div className='w-full cursor-pointer'>
                    <Upload className="mr-2 h-4 w-4" />
                    {document ? 'Replace Document' : 'Upload Document'}
                </div>
            </Button>
        </label>
        <Input 
            id={`file-upload-${documentType}`} 
            type="file" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={uploading}
        />
      </CardFooter>
    </Card>
  );
}
