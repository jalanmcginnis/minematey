"use client";

import { ChangeEvent, useState } from "react";
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useActiveMine } from "@/context/MineContext";
import {
  deleteDoc,
  doc,
  query,
  where,
  collection,
} from "firebase/firestore";
import { deleteStorageObject, formatUploadError, uploadDocumentRecord } from "@/lib/upload-document";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";

type DocType = {
  id: string;
  userId: string;
  documentName: string;
  type: "annual-refresher";
  fileUrl: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadDate?: { toDate: () => Date } | null;
};

const MAX_DOCS = 100;
const DOC_TYPE = "annual-refresher";
const FOLDER_NAME = "annual-refresher";
const CATEGORY_NAME = "Annual Refresher Training (8 hr)";
const COLLECTION_NAME = "training_documents" as const;

export function AnnualRefresherTrainingCard() {
  const { user, isUserLoading } = useUser();
  const { profile } = useAuth();
  const { selectedMineId } = useActiveMine();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const docsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, COLLECTION_NAME),
      where("type", "==", DOC_TYPE)
    );
  }, [user, firestore]);

  const { data: allDocs, isLoading } = useCollection<DocType>(docsQuery);

  const documents = (allDocs ?? [])
    .filter((d) => d.type === DOC_TYPE)
    .sort((a, b) => {
      const aTime = a.uploadDate?.toDate ? a.uploadDate.toDate().getTime() : 0;
      const bTime = b.uploadDate?.toDate ? b.uploadDate.toDate().getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, MAX_DOCS);

  const handleUpload = async (file: File) => {
    if (isUserLoading) {
      toast({ title: "Please wait", description: "Sign-in is still finishing. Try the upload again in a moment." });
      return;
    }
    if (!user || !firestore || !storage) {
      console.error("Document upload blocked: user or Firebase services are not ready.", { type: DOC_TYPE });
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be signed in to upload documents." });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await uploadDocumentRecord({
        storage,
        firestore,
        collectionName: COLLECTION_NAME,
        folder: FOLDER_NAME,
        file,
        userId: user.uid,
        type: DOC_TYPE,
        category: CATEGORY_NAME,
        companyId: profile?.companyId || "comp_test_001",
        mshaMineId: selectedMineId,
        onProgress: setProgress,
      });
      toast({ title: "Uploaded", description: `"${file.name}" saved.` });
    } catch (error: unknown) {
      console.error("Failed to upload document:", error);
      toast({ variant: "destructive", title: "Upload failed", description: formatUploadError(error) });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const deleteDocItem = async (r: DocType) => {
    if (!user || !firestore || !storage) return;

    try {
      await deleteStorageObject(storage, r.storagePath);
    } catch (err: unknown) {
      console.error("Error deleting storage object:", err);
      toast({ variant: "destructive", title: "Delete failed", description: formatUploadError(err) });
      return;
    }

    try {
      await deleteDoc(doc(firestore, COLLECTION_NAME, r.id));
    } catch (error: unknown) {
      console.error("Failed to delete document record:", error);
      toast({ variant: "destructive", title: "Delete failed", description: formatUploadError(error) });
      return;
    }
    toast({ title: "Deleted", description: "Document removed." });
  };

  return (
    <Card className="bg-secondary">
      <CardHeader>
        <CardTitle className="text-secondary-foreground">Annual Refresher Training</CardTitle>
        <CardDescription className="text-secondary-foreground/80">Upload up to {MAX_DOCS} training records (newest first).</CardDescription>
      </CardHeader>

      <CardContent>
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</div>
          </div>
        )}
        <ScrollArea className="h-[240px] pr-4">
            <div className="space-y-3">
            {isLoading && (
            <div className="flex items-center justify-center py-6 h-[240px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            )}

            {!isLoading && documents.length === 0 && (
            <div className="flex items-center justify-center text-sm text-secondary-foreground/60 h-[240px]">
                No training records uploaded yet.
            </div>
            )}

            {!isLoading &&
            documents.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border p-3 bg-background/50">
                <div className="min-w-0">
                    <div className="font-medium truncate">{r.documentName}</div>
                    <div className="text-xs text-muted-foreground">
                    {r.uploadDate?.toDate ? r.uploadDate.toDate().toLocaleDateString() : "—"}
                    </div>
                </div>

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
                    <DropdownMenuItem asChild>
                        <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                        <Download className="mr-2 h-4 w-4" /> View
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteDocItem(r)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            ))}
            </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3">
        <div className="text-xs text-secondary-foreground/80">
          Showing <strong>{Math.min(documents.length, MAX_DOCS)}</strong> / <strong>{MAX_DOCS}</strong>
        </div>

        <label className="cursor-pointer">
          <Button asChild variant="secondary" disabled={uploading}>
            <div>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </div>
          </Button>
          <Input type="file" className="hidden" onChange={onFileChange} disabled={uploading} />
        </label>
      </CardFooter>
    </Card>
  );
}
