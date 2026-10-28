'use client';

import { ChangeEvent, useState } from 'react';
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from '@/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const documentQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'documents'),
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
    if (!user || !storage || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to upload documents.',
      });
      return;
    }

    if (document) {
      // If a document exists, delete it first before uploading the new one.
      await handleDelete(false); // Call handleDelete without showing a toast
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
    const storagePath = `users/${user.uid}/documents/${documentType}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        setUploading(false);
        setError(`Upload failed: ${error.code ?? ''} ${error.message}`);
        toast({
          variant: 'destructive',
          title: 'Upload Error',
          description: `${error.code ?? ''} ${error.message}`,
        });
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const docsCollection = collection(firestore, 'users', user.uid, 'documents');
          const docData = {
            userId: user.uid,
            documentName: file.name,
            type: documentType,
            fileUrl: downloadURL,
            storagePath,
            fileType: file.type,
            fileSize: file.size,
            uploadDate: serverTimestamp(),
          };

          const docRef = await addDoc(docsCollection, docData);

          toast({
            title: 'Upload Successful',
            description: `"${file.name}" uploaded successfully.`,
          });
        } catch (err: any) {
          console.error('Upload completion failed:', err);
          setError(`Completion failed: ${err.code ?? ''} ${err.message ?? String(err)}`);
          toast({
            variant: 'destructive',
            title: 'Save/URL Failed',
            description: `${err.code ?? ''} ${err.message ?? String(err)}`,
          });
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handleDelete = async (showToast = true) => {
    if (!user || !firestore || !storage || !document) return;

    const docRef = doc(firestore, 'users', user.uid, 'documents', document.id);
    const storageRef = ref(storage, document.storagePath);

    try {
      // Attempt to delete the file from storage first.
      await deleteObject(storageRef);
    } catch (storageError: any) {
        console.error('Error deleting file from storage:', storageError);
        // If the object doesn't exist, we can ignore the error and proceed to delete the Firestore doc.
        if (storageError.code !== 'storage/object-not-found') {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: `Could not delete the file from storage: ${storageError.message}`,
            });
            return; // Stop if it's an error other than not found.
        }
    }

    try {
      // Now delete the Firestore document record.
      await deleteDoc(docRef);
      if (showToast) {
        toast({
          title: 'Deleted',
          description: 'The document has been successfully deleted.',
        });
      }
    } catch (dbError: any) {
       console.error('Error deleting document from Firestore:', dbError);
       errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
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
