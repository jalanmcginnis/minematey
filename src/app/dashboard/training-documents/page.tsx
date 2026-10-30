'use client';

import { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  GraduationCap,
  Award,
  RefreshCw,
  Wrench,
  HardHat,
  LucideIcon,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useActiveMine } from '@/context/MineContext';
import { ActiveMineBadge } from '@/components/active-mine-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TrainingDocumentCategoryCard,
  TrainingDocRecord,
} from '@/components/training-document-category-card';

interface TrainingCategoryConfig {
  name: string;
  description: string;
  icon: LucideIcon;
  isPlanCard?: boolean;
}

export const TRAINING_DOCUMENT_CATEGORIES: TrainingCategoryConfig[] = [
  {
    name: 'Approved Training Plan (Part 46 / Part 48)',
    description: 'MSHA-approved Part 46 or Part 48 training plan and revisions.',
    icon: BookOpenCheck,
    isPlanCard: true,
  },
  {
    name: 'New Miner Training (24 / 40 hr)',
    description: '5000-23 certificates and records for new surface or underground miners.',
    icon: GraduationCap,
  },
  {
    name: 'Newly Hired Experienced Miner Training',
    description: 'Onboarding training records for newly hired experienced miners.',
    icon: Award,
  },
  {
    name: 'Annual Refresher Training (8 hr)',
    description: 'Mandatory 8-hour annual safety refresher certificates for active miners.',
    icon: RefreshCw,
  },
  {
    name: 'Task Training (Equipment & Hazard assignments)',
    description: 'New task and equipment-specific operational safety training records.',
    icon: Wrench,
  },
  {
    name: 'Site-Specific Hazard Training (Contractors, visitors, haulers)',
    description: 'Hazard awareness training logs for contractors, customers, and visitors.',
    icon: HardHat,
  },
];

export default function TrainingDocumentsPage() {
  const firestore = useFirestore();

  // Consume global active MSHA Mine ID from MineContext
  const { selectedMineId } = useActiveMine();

  // Data Fetching & Dynamic Filtering State
  const [allMineRecords, setAllMineRecords] = useState<TrainingDocRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewingRecord, setViewingRecord] = useState<TrainingDocRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    setIsLoading(true);

    // Subscribe to training_documents filtered by global selectedMineId
    const q = query(
      collection(firestore, 'training_documents'),
      where('mshaMineId', '==', selectedMineId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedRecords: TrainingDocRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            companyId: data.companyId || 'comp_test_001',
            mshaMineId: data.mshaMineId || selectedMineId,
            category: data.category || '',
            documentTitle: data.documentTitle || 'Untitled Record',
            minerName: data.minerName || '',
            completionDate: data.completionDate || data.createdAt || '',
            expirationDate: data.expirationDate || null,
            fileName: data.fileName || 'certificate.pdf',
            fileUrl: data.fileUrl || '',
            storagePath: data.storagePath || '',
            createdAt: data.createdAt || '',
          };
        });

        // Sort records by completionDate / createdAt descending in JavaScript
        fetchedRecords.sort((a, b) => {
          const timeA = new Date(a.completionDate || a.createdAt || 0).getTime();
          const timeB = new Date(b.completionDate || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setAllMineRecords(fetchedRecords);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error retrieving training documents:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedMineId]);

  const handleViewRecord = (record: TrainingDocRecord) => {
    setViewingRecord(record);
    setIsViewDialogOpen(true);
  };

  const formatDateDisplay = (rawDate: string | null) => {
    if (!rawDate) return '—';
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? rawDate : parsed.toLocaleDateString();
  };

  const isViewingPlanRecord =
    viewingRecord?.category.toLowerCase().includes('approved training plan') ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage MSHA Part 46 / Part 48 training plans and miner certificates by category.
          </p>
        </div>

        <ActiveMineBadge />
      </div>

      {/* 2 & 3. Visual Grid of Dedicated Training Category Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TRAINING_DOCUMENT_CATEGORIES.map((categoryConfig) => {
          const categoryRecords = allMineRecords.filter(
            (rec) =>
              rec.mshaMineId === selectedMineId &&
              rec.category === categoryConfig.name
          );

          return (
            <TrainingDocumentCategoryCard
              key={categoryConfig.name}
              categoryName={categoryConfig.name}
              description={categoryConfig.description}
              icon={categoryConfig.icon}
              selectedMineId={selectedMineId}
              records={categoryRecords}
              isLoading={isLoading}
              isPlanCard={categoryConfig.isPlanCard}
              onViewRecord={handleViewRecord}
            />
          );
        })}
      </div>

      {/* Training Record Details Modal */}
      {viewingRecord && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isViewingPlanRecord ? 'Training Plan Details' : 'Training Record Details'}
              </DialogTitle>
              <DialogDescription>
                {isViewingPlanRecord
                  ? `Approved training plan details for ${viewingRecord.documentTitle}.`
                  : `Certificate and compliance details for ${viewingRecord.documentTitle}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Category:</span>
                <div className="col-span-2">
                  <Badge variant="secondary">{viewingRecord.category}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  {isViewingPlanRecord ? 'Plan Title / Version:' : 'Document / Course:'}
                </span>
                <span className="col-span-2 font-medium">{viewingRecord.documentTitle}</span>
              </div>
              {!isViewingPlanRecord && (
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-muted-foreground">Miner / Trainee:</span>
                  <span className="col-span-2">
                    {viewingRecord.minerName || 'Unassigned Miner'}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">
                  {isViewingPlanRecord ? 'Effective Date:' : 'Completion Date:'}
                </span>
                <span className="col-span-2">{formatDateDisplay(viewingRecord.completionDate)}</span>
              </div>
              {!isViewingPlanRecord && (
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-muted-foreground">Expiration Date:</span>
                  <span className="col-span-2">
                    {viewingRecord.expirationDate
                      ? formatDateDisplay(viewingRecord.expirationDate)
                      : 'N/A'}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">File Attachment:</span>
                <span className="col-span-2">
                  {viewingRecord.fileUrl ? (
                    <a
                      href={viewingRecord.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {viewingRecord.fileName || 'Open file'}
                    </a>
                  ) : (
                    viewingRecord.fileName || 'No file stored'
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">MSHA Mine ID:</span>
                <span className="col-span-2">{viewingRecord.mshaMineId}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Company ID:</span>
                <span className="col-span-2">{viewingRecord.companyId}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
