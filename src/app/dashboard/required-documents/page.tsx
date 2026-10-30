'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Flag,
  Users,
  BarChart3,
  AlertTriangle,
  FlaskConical,
  Truck,
  Ear,
  Wind,
  Siren,
  Zap,
  Gauge,
  Fan,
  Map,
  Mountain,
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
  RequiredDocumentCategoryCard,
  RequiredDocRecord,
} from '@/components/required-document-category-card';
import { formatCalendarDate } from '@/lib/format-calendar-date';

interface CategoryConfig {
  name: string;
  description: string;
  icon: LucideIcon;
}

export const REQUIRED_DOCUMENT_CATEGORIES: CategoryConfig[] = [
  {
    name: 'Legal Identity',
    description: 'MSHA Form 2000-7 Legal Identity Report & updates.',
    icon: Building2,
  },
  {
    name: 'Commencements',
    description: 'Notices of mine opening, closing, or reactivation.',
    icon: Flag,
  },
  {
    name: 'Contractor List',
    description: 'Register of independent contractors working on site.',
    icon: Users,
  },
  {
    name: 'Quarterly Reports',
    description: 'MSHA 7000-2 Quarterly Mine Employment & Coal Production.',
    icon: BarChart3,
  },
  {
    name: 'Accident Reports',
    description: 'MSHA 7000-1 Mine Accident, Injury, and Illness Reports.',
    icon: AlertTriangle,
  },
  {
    name: 'HazCom Program',
    description: 'Written Hazard Communication program and SDS inventory.',
    icon: FlaskConical,
  },
  {
    name: 'Mobile Haulage Safety Plan',
    description: 'Surface and underground mobile equipment traffic safety plan.',
    icon: Truck,
  },
  {
    name: 'Hearing Conservation Program',
    description: 'Occupational noise exposure monitoring and protection records.',
    icon: Ear,
  },
  {
    name: 'Respirator Program',
    description: 'Respiratory protection SOPs, fit testing, and medical evaluations.',
    icon: Wind,
  },
  {
    name: 'Emergency & Evacuation Plan',
    description: 'Mine emergency response, firefighting, and evacuation procedures.',
    icon: Siren,
  },
  {
    name: 'Continuity & Resistance Testing',
    description: 'Grounding system continuity and resistance test logs.',
    icon: Zap,
  },
  {
    name: 'Compressor / Pressure Vessel Inspections',
    description: 'Air receiver and pressure vessel safety inspection certificates.',
    icon: Gauge,
  },
  {
    name: 'Underground Ventilation Plan',
    description: 'Approved mine ventilation system and methane/dust control plan.',
    icon: Fan,
  },
  {
    name: 'Underground Maps & Escapeways',
    description: 'Updated mine workings maps and designated escapeway routes.',
    icon: Map,
  },
  {
    name: 'Ground Control Plan',
    description: 'Roof, rib, and highwall stability and ground support plan.',
    icon: Mountain,
  },
];

export default function RequiredDocumentsPage() {
  const firestore = useFirestore();

  // Consume global active MSHA Mine ID from MineContext
  const { selectedMineId } = useActiveMine();

  // Data Fetching State
  const [allMineDocuments, setAllMineDocuments] = useState<RequiredDocRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewingDoc, setViewingDoc] = useState<RequiredDocRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    setIsLoading(true);

    // Subscribe to required_documents filtered by global selectedMineId
    const q = query(
      collection(firestore, 'required_documents'),
      where('mshaMineId', '==', selectedMineId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedDocs: RequiredDocRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            companyId: data.companyId || 'comp_test_001',
            mshaMineId: data.mshaMineId || selectedMineId,
            category: data.category || '',
            documentTitle: data.documentTitle || 'Untitled Document',
            fileName: data.fileName || 'document.pdf',
            fileUrl: data.fileUrl || '',
            storagePath: data.storagePath || '',
            date: data.date || data.createdAt || '',
            createdAt: data.createdAt || '',
          };
        });

        // Sort descending by date in JavaScript
        fetchedDocs.sort((a, b) => {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setAllMineDocuments(fetchedDocs);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error retrieving required documents:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedMineId]);

  const handleViewDocument = (docRecord: RequiredDocRecord) => {
    setViewingDoc(docRecord);
    setIsViewDialogOpen(true);
  };

  const formatDocDate = (rawDate: string) => formatCalendarDate(rawDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Required Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage MSHA compliance documents across dedicated category cards.
          </p>
        </div>

        <ActiveMineBadge />
      </div>

      {/* 2 & 3. Visual Grid of Dedicated Category Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REQUIRED_DOCUMENT_CATEGORIES.map((categoryConfig) => {
          const categoryDocs = allMineDocuments.filter(
            (docItem) =>
              docItem.mshaMineId === selectedMineId &&
              docItem.category === categoryConfig.name
          );

          return (
            <RequiredDocumentCategoryCard
              key={categoryConfig.name}
              categoryName={categoryConfig.name}
              description={categoryConfig.description}
              icon={categoryConfig.icon}
              selectedMineId={selectedMineId}
              documents={categoryDocs}
              isLoading={isLoading}
              onViewDocument={handleViewDocument}
            />
          );
        })}
      </div>

      {/* Document Details Modal */}
      {viewingDoc && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Required Document Details</DialogTitle>
              <DialogDescription>
                Compliance document record for {viewingDoc.category}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Category:</span>
                <div className="col-span-2">
                  <Badge variant="secondary">{viewingDoc.category}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Document Title:</span>
                <span className="col-span-2 font-medium">{viewingDoc.documentTitle}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">File Name:</span>
                <span className="col-span-2">
                  {viewingDoc.fileUrl ? (
                    <a
                      href={viewingDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {viewingDoc.fileName || 'Open file'}
                    </a>
                  ) : (
                    viewingDoc.fileName || 'No file stored'
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Effective Date:</span>
                <span className="col-span-2">{formatDocDate(viewingDoc.date)}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">MSHA Mine ID:</span>
                <span className="col-span-2">{viewingDoc.mshaMineId}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-semibold text-muted-foreground">Company ID:</span>
                <span className="col-span-2">{viewingDoc.companyId}</span>
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
