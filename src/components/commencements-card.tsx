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

type CommencementDoc = {
  id: string;
  userId: string;
  type: "mine-commencements";
  documentName: string;
  fileUrl: string;
  storagePath: string;
  fileSize: number;
  uploadDate?: { toDate: () => Date } | null;
};

const MAX_COMMENCEMENTS = 5;

export function CommencementsCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const queryRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, "users", user.uid, "documents"),
      orderBy("uploadDate", "desc"),
      limit(MAX_COMMENCEMENTS)
    );
  }, [user, firestore]);

  const { data, isLoading } = useCollection<CommencementDoc>(queryRef);

  const commencements = (data ?? []).filter(d => d.type === "mine-commencements");

  const uploadFile = (file: File) => {
    if (!user || !firestore || !storage) return;

    setUploading(true);
    setProgress(0);

    const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
    const storagePath = `users/${user.uid}/documents/commencements/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      s => setProgress((s.bytesTransferred / s.totalBytes) * 100),
      err => {
        console.error("Upload error:", err);
        setUploading(false);
        toast({ variant: "destructive", title: "Upload failed", description: err.message });
      },
      async () => {
        try {
          const fileUrl = await getDownloadURL(task.snapshot.ref);
          await addDoc(collection(firestore, "users", user.uid, "documents"), {
            userId: user.uid,
            type: "mine-commencements",
            documentName: file.name,
            fileUrl,
            storagePath,
            fileSize: file.size,
            uploadDate: serverTimestamp(),
          });
          toast({ title: "Uploaded", description: `"${file.name}" saved.` });
        } catch (e: any) {
          console.error("Failed to save commencement document:", e);
          toast({ variant: "destructive", title: "Save failed", description: e?.message ?? String(e) });
        } finally {
          setUploading(false);
          setProgress(0);
        }
      }
    );
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const remove = async (docData: CommencementDoc) => {
    if (!user || !firestore || !storage) return;

    try {
      await deleteObject(ref(storage, docData.storagePath));
    } catch (error) {
      console.error("Error deleting storage object:", error);
    }

    await deleteDoc(doc(firestore, "users", user.uid, "documents", docData.id));
    toast({ title: "Deleted", description: "Commencement removed." });
  };

  return (
    <Card className="bg-secondary">
      <CardHeader>
        <CardTitle className="text-secondary-foreground">Mine Commencements</CardTitle>
        <CardDescription className="text-secondary-foreground/80">Store up to {MAX_COMMENCEMENTS} commencement records.</CardDescription>
      </CardHeader>

      <CardContent>
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="text-xs text-center text-muted-foreground">
              {Math.round(progress)}%
            </div>
          </div>
        )}
        <ScrollArea className="h-[240px] pr-4">
          <div className="space-y-3">
            {isLoading && (
              <div className="flex justify-center items-center py-6 h-[240px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && commencements.length === 0 && (
              <div className="flex items-center justify-center text-sm text-secondary-foreground/60 h-[240px]">
                No commencement documents uploaded.
              </div>
            )}

            {!isLoading && commencements.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-md border p-3 bg-background/50">
                <div>
                  <div className="font-medium truncate text-foreground">{d.documentName}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.uploadDate?.toDate()?.toLocaleDateString()}
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
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                        <Download className="mr-2 h-4 w-4" /> View
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => remove(d)}
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

      <CardFooter className="flex justify-between">
        <div className="text-xs text-secondary-foreground/80">
          {commencements.length} / {MAX_COMMENCEMENTS}
        </div>

        <label>
          <Button asChild variant="secondary" disabled={uploading}>
            <div>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </div>
          </Button>
          <Input type="file" className="hidden" onChange={onChange} />
        </label>
      </CardFooter>
    </Card>
  );
}
