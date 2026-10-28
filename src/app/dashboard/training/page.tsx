'use client';

import { Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

interface TrainingDocument {
  id: string;
  userId: string;
  documentName: string;
  trainingType: string;
  fileUrl: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadDate: {
    toDate: () => Date;
  } | null;
}

export default function TrainingPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const trainingCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'trainings'));
  }, [firestore, user]);

  const { data: documents, isLoading } = useCollection<TrainingDocument>(trainingCollectionQuery);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Training Documents</CardTitle>
          <CardDescription>
            A list of training plans and records for all personnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Size</TableHead>
                <TableHead className="hidden md:table-cell">Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading training documents...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.documentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.trainingType}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.fileSize ? formatFileSize(doc.fileSize) : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.uploadDate && typeof (doc.uploadDate as any).toDate === 'function'
                        ? (doc.uploadDate as any).toDate().toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No training documents found.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{documents?.length || 0}</strong> of{' '}
            <strong>{documents?.length || 0}</strong> documents
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
