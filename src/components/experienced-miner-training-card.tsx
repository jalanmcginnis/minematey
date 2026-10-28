"use client";

import { ChangeEvent, useState } from "react";
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from "@/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
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
  type: "experienced-miner-training";
  fileUrl: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadDate?: { toDate: () => Date } | null;
};

const MAX_DOCS = 100;
const DOC_TYPE = "experienced-miner-training";
const FOLDER_NAME = "experienced-miner-training";

export function ExperiencedMinerTrainingCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const docsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, "users", user.uid, "documents"),
      orderBy("uploadDate", "desc"),
      limit(MAX_DOCS)
    );
  }, [user, firestore]);

  const { data: allDocs, isLoading } = useCollection<DocType>(docsQuery);

  const documents = (allDocs ?? []).filter((d) => d.type === DOC_TYPE);

  const handleUpload = (file: File) => {
    if (!user || !firestore || !storage) {
      toast({ variant: "destructive", title: "Auth Error", description: "You must be logged in." });
      return;
    }

    setUploading(true);
    setProgress(0);

    const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
    const storagePath = `users/${user.uid}/documents/${FOLDER_NAME}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      (err) => {
        console.error("Upload error:", err);
        setUploading(false);
        setProgress(0);
        toast({ variant: "destructive", title: "Upload failed", description: `${err.code} ${err.message}` });
      },
      async () => {
        try {
          const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(firestore, "users", user.uid, "documents"), {
            userId: user.uid,
            type: DOC_TYPE,
            documentName: file.name,
            fileUrl,
            storagePath,
            fileType: file.type,
            fileSize: file.size,
            uploadDate: serverTimestamp(),
          });

          toast({ title: "Uploaded", description: `"${file.name}" saved.` });
        } catch (e: any) {
          console.error("Failed to save training document:", e);
          toast({ variant: "destructive", title: "Save failed", description: e.message ?? String(e) });
        } finally {
          setUploading(false);
          setProgress(0);
        }
      }
    );
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const deleteDocItem = async (r: DocType) => {
    if (!user || !firestore || !storage) return;

    try {
      await deleteObject(ref(storage, r.storagePath));
    } catch (err: any) {
      console.error("Error deleting storage object:", err);
      if (err.code !== "storage/object-not-found") {
        toast({ variant: "destructive", title: "Delete failed", description: err.message });
        return;
      }
    }

    await deleteDoc(doc(firestore, "users", user.uid, "documents", r.id));
    toast({ title: "Deleted", description: "Document removed." });
  };

  return (
    <Card className="bg-secondary">
      <CardHeader>
        <CardTitle className="text-secondary-foreground">Newly Hired Experienced Miner Training</CardTitle>
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
