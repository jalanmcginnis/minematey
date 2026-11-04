'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useActiveMine } from '@/context/MineContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type OpenDefect = {
  id: string;
  kind: 'Workplace' | 'Equipment';
  title: string;
  detail: string;
  href: string;
};

const WEEK_KEY = 'minematey_open_defect_reminder_week';

function currentWeekKey(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / 86400000 + start.getUTCDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

function isCorrected(exam: Record<string, unknown>): boolean {
  const status = String(exam.status || '').toLowerCase();
  return (
    status === 'corrected' ||
    Boolean(exam.correctedAt && (exam.correctiveActionNotes || exam.correctiveAction))
  );
}

function isWorkplaceDefect(exam: Record<string, unknown>): boolean {
  if (isCorrected(exam)) return false;
  const status = String(exam.status || '').toLowerCase();
  const safety = String(exam.safetyStatus || exam.status || '').toLowerCase();
  return status.includes('defect') || safety.includes('defect');
}

function isEquipmentDefect(exam: Record<string, unknown>): boolean {
  if (isCorrected(exam)) return false;
  const status = String(exam.status || '').toLowerCase();
  const safety = String(exam.safetyStatus || exam.status || '').toLowerCase();
  const defectText = String(exam.defectDetails || exam.defectsFound || '').trim();
  return (
    status.includes('defect') ||
    safety.includes('defect') ||
    (defectText.length > 0 && defectText.toLowerCase() !== 'none')
  );
}

export function OpenDefectReminder() {
  const firestore = useFirestore();
  const { profile } = useAuth();
  const { selectedMineId } = useActiveMine();
  const [workplace, setWorkplace] = useState<OpenDefect[]>([]);
  const [equipment, setEquipment] = useState<OpenDefect[]>([]);
  const [isWeekly, setIsWeekly] = useState(false);

  const companyId = profile?.companyId || 'comp_test_001';

  useEffect(() => {
    const week = currentWeekKey();
    const storageKey = `${WEEK_KEY}:${companyId}:${selectedMineId}`;
    const last = window.localStorage.getItem(storageKey);
    setIsWeekly(last !== week);
    window.localStorage.setItem(storageKey, week);
  }, [companyId, selectedMineId]);

  useEffect(() => {
    if (!firestore || !selectedMineId) return;

    const base = [
      where('mshaMineId', '==', selectedMineId),
      where('companyId', '==', companyId),
    ];

    const unsubWorkplace = onSnapshot(
      query(collection(firestore, 'workplace_exams'), ...base),
      (snapshot) => {
        const open = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((exam) => isWorkplaceDefect(exam as Record<string, unknown>))
          .map((exam) => ({
            id: exam.id,
            kind: 'Workplace' as const,
            title: String(exam.area || exam.location || exam.workArea || 'Workplace exam'),
            detail: String(exam.findings || exam.defectDetails || exam.notes || 'Open defect'),
            href: '/dashboard/workplace-exams',
          }));
        setWorkplace(open);
      },
      (error) => console.error('Open workplace defect reminder failed:', error)
    );

    const unsubEquipment = onSnapshot(
      query(collection(firestore, 'equipment_exams'), ...base),
      (snapshot) => {
        const open = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((exam) => isEquipmentDefect(exam as Record<string, unknown>))
          .map((exam) => ({
            id: exam.id,
            kind: 'Equipment' as const,
            title: String(exam.equipmentId || exam.unitId || exam.equipment || 'Equipment exam'),
            detail: String(exam.defectDetails || exam.defectsFound || exam.notes || 'Open defect'),
            href: '/dashboard/equipment-exams',
          }));
        setEquipment(open);
      },
      (error) => console.error('Open equipment defect reminder failed:', error)
    );

    return () => {
      unsubWorkplace();
      unsubEquipment();
    };
  }, [firestore, selectedMineId, companyId]);

  const openDefects = useMemo(() => [...workplace, ...equipment], [workplace, equipment]);

  if (openDefects.length === 0) return null;

  const mailBody = openDefects
    .map((item) => `${item.kind}: ${item.title} — ${item.detail}`)
    .join('\n');

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Uncorrected defects
            </CardTitle>
            <CardDescription>
              {isWeekly ? 'Weekly reminder. ' : ''}
              {openDefects.length} open defect{openDefects.length === 1 ? '' : 's'} for mine {selectedMineId}. Any defect needs to be corrected.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <a
              href={`mailto:?subject=${encodeURIComponent(
                `Weekly open defect reminder — ${selectedMineId}`
              )}&body=${encodeURIComponent(mailBody)}`}
            >
              Email reminder
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {openDefects.slice(0, 8).map((item) => (
          <div key={`${item.kind}-${item.id}`} className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.kind}: {item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href={item.href}>Open</Link>
            </Button>
          </div>
        ))}
        {openDefects.length > 8 && (
          <p className="text-xs text-muted-foreground">
            Showing 8 of {openDefects.length} open defects.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
