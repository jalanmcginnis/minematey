'use client';

import {
  addDoc,
  collection,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
} from 'firebase/storage';

export type DocumentCollectionName = 'required_documents' | 'training_documents';

/**
 * Storage object names reject or break on # ? [ ] * and path separators.
 * Keep the original file name in Firestore; only the object path is sanitized.
 */
export function sanitizeStorageFileName(fileName: string): string {
  const base = (fileName || 'file').split(/[/\\]/).pop() || 'file';
  const cleaned = base.replace(/[^\w.\-() ]+/g, '_').replace(/^\.+$/, '_').trim();
  return (cleaned || 'file').slice(0, 180);
}

export function formatUploadError(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as { code?: string; message?: string };
    const code = err.code ? `${err.code}: ` : '';
    const message = err.message || 'Upload failed';
    return `${code}${message}`.trim();
  }
  return error instanceof Error ? error.message : 'Upload failed';
}

export async function uploadFileResumable(
  storage: FirebaseStorage,
  storagePath: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ downloadUrl: string; storagePath: string }> {
  const storageRef = ref(storage, storagePath);
  const contentType = file.type || 'application/octet-stream';
  const task = uploadBytesResumable(storageRef, file, { contentType });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        }
      },
      (error) => {
        console.error('Firebase Storage upload failed:', {
          storagePath,
          code: (error as { code?: string }).code,
          message: (error as { message?: string }).message,
          error,
        });
        reject(error);
      },
      () => resolve(),
    );
  });

  try {
    const downloadUrl = await getDownloadURL(task.snapshot.ref);
    return { downloadUrl, storagePath };
  } catch (error) {
    console.error('getDownloadURL failed after upload:', { storagePath, error });
    try {
      await deleteObject(storageRef);
    } catch (cleanupError) {
      console.error('Failed to remove storage object after getDownloadURL failed:', cleanupError);
    }
    throw error;
  }
}

export async function deleteStorageObject(
  storage: FirebaseStorage,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'storage/object-not-found') return;
    console.error('Error deleting storage object:', { storagePath, error });
    throw error;
  }
}

export interface UploadDocumentRecordInput {
  storage: FirebaseStorage;
  firestore: Firestore;
  collectionName: DocumentCollectionName;
  folder: string;
  file: File;
  userId: string;
  type: string;
  category: string;
  companyId: string;
  mshaMineId: string;
  documentTitle?: string;
  minerName?: string;
  completionDate?: string;
  expirationDate?: string | null;
  date?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Upload the file first, then write the Firestore record.
 * Metadata goes to required_documents or training_documents — the collections
 * the lists listen to and that the deployed rules allow for a signed-in user.
 * users/{uid}/documents is rejected by the live Firestore rules, so it is not used.
 */
export async function uploadDocumentRecord(input: UploadDocumentRecordInput): Promise<void> {
  const safeName = sanitizeStorageFileName(input.file.name);
  const mineSegment = (input.mshaMineId || 'mine').replace(/[^\w.\-]+/g, '_');
  const folderSegment = (input.folder || 'files').replace(/[^\w.\-]+/g, '_');
  const storagePath = `${input.collectionName}/${mineSegment}/${folderSegment}/${Date.now()}_${safeName}`;
  const today = new Date().toISOString().split('T')[0];
  const effectiveDate = input.date || input.completionDate || today;

  let stored = false;
  try {
    const { downloadUrl } = await uploadFileResumable(
      input.storage,
      storagePath,
      input.file,
      input.onProgress,
    );
    stored = true;

    const record = {
      userId: input.userId,
      type: input.type,
      category: input.category,
      documentName: input.file.name,
      documentTitle: input.documentTitle?.trim() || input.file.name,
      fileName: input.file.name,
      fileUrl: downloadUrl,
      storagePath,
      fileType: input.file.type || 'application/octet-stream',
      fileSize: input.file.size,
      companyId: input.companyId || 'comp_test_001',
      mshaMineId: input.mshaMineId,
      minerName: input.minerName ?? '',
      completionDate: input.completionDate || effectiveDate,
      expirationDate: input.expirationDate ?? null,
      date: effectiveDate,
      submissionDate: effectiveDate,
      createdAt: new Date().toISOString(),
      uploadDate: serverTimestamp(),
    };

    await addDoc(collection(input.firestore, input.collectionName), record);
  } catch (error) {
    console.error('Document upload failed:', {
      collection: input.collectionName,
      storagePath,
      type: input.type,
      error,
    });
    if (stored) {
      try {
        await deleteStorageObject(input.storage, storagePath);
      } catch (cleanupError) {
        console.error('Failed to remove orphaned storage object:', cleanupError);
      }
    }
    throw error;
  }
}
