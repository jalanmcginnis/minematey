'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Check,
  User,
  ShieldAlert,
  Loader2,
  BarChart3,
  Upload,
} from 'lucide-react';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useActiveMine } from '@/context/MineContext';
import { ActiveMineBadge } from '@/components/active-mine-badge';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getNextQuarterlyReportDeadline } from '@/lib/msha-quarterly-deadline';

export type HorizonFilterValue = 30 | 60 | 90 | 'all';

export interface WatchlistItem {
  id: string;
  source: 'Training' | 'Required Document';
  title: string;
  category: string;
  minerName?: string;
  dueDate: string;
  daysRemaining: number;
}

export interface ScheduleEventRecord {
  id: string;
  companyId: string;
  mshaMineId: string;
  title: string;
  category: string;
  date: string;
  assignedTo: string;
  completed?: boolean;
  createdAt: string;
}

const SCHEDULE_CATEGORIES = [
  'MSHA Inspection Prep',
  'Dust Sampling',
  'Safety Meeting',
  'Evacuation Drill',
  'Equipment Audit',
  'Quarterly Compliance Review',
  'Other Safety Task',
] as const;

export default function SchedulingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Consume global active MSHA Mine ID from MineContext
  const { selectedMineId, selectedMineLabel } = useActiveMine();
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilterValue>(30);

  // 2. Automated Expiration & Inspection Watchlist State
  const [trainingDocs, setTrainingDocs] = useState<any[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<any[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);

  // 3. Custom Event / Audit Scheduler Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<string>(SCHEDULE_CATEGORIES[0]);
  const [dateInput, setDateInput] = useState(todayStr);
  const [assignedInput, setAssignedInput] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // 4. Event Schedule List State
  const [schedules, setSchedules] = useState<ScheduleEventRecord[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  // Listen to training_documents and required_documents for the Watchlist & Statutory Tracker
  useEffect(() => {
    if (!firestore) return;

    setIsLoadingWatchlist(true);

    let unsubTraining: (() => void) | undefined;
    let unsubRequired: (() => void) | undefined;

    try {
      const trainingQuery = query(
        collection(firestore, 'training_documents'),
        where('mshaMineId', '==', selectedMineId)
      );

      unsubTraining = onSnapshot(
        trainingQuery,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          setTrainingDocs(docs);
          setIsLoadingWatchlist(false);
        },
        (error) => {
          console.error('Error querying training_documents for watchlist:', error);
          setIsLoadingWatchlist(false);
        }
      );
    } catch (error) {
      console.error('Error setting up training_documents listener:', error);
      setIsLoadingWatchlist(false);
    }

    try {
      const requiredQuery = query(
        collection(firestore, 'required_documents'),
        where('mshaMineId', '==', selectedMineId)
      );

      unsubRequired = onSnapshot(
        requiredQuery,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          setRequiredDocs(docs);
          setIsLoadingWatchlist(false);
        },
        (error) => {
          console.error('Error querying required_documents for watchlist:', error);
          setIsLoadingWatchlist(false);
        }
      );
    } catch (error) {
      console.error('Error setting up required_documents listener:', error);
      setIsLoadingWatchlist(false);
    }

    return () => {
      if (unsubTraining) unsubTraining();
      if (unsubRequired) unsubRequired();
    };
  }, [firestore, selectedMineId]);

  // Listen to schedules collection for the Event Schedule List
  useEffect(() => {
    if (!firestore) return;

    setIsLoadingSchedules(true);

    let unsubSchedules: (() => void) | undefined;

    try {
      const schedulesQuery = query(
        collection(firestore, 'schedules'),
        where('mshaMineId', '==', selectedMineId)
      );

      unsubSchedules = onSnapshot(
        schedulesQuery,
        (snapshot) => {
          const fetched: ScheduleEventRecord[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              companyId: data.companyId || 'comp_test_001',
              mshaMineId: data.mshaMineId || selectedMineId,
              title: data.title || 'Untitled Task',
              category: data.category || 'General',
              date: data.date || '',
              assignedTo: data.assignedTo || 'Unassigned',
              completed: Boolean(data.completed),
              createdAt: data.createdAt || '',
            };
          });

          // Sort chronologically by date ascending
          fetched.sort((a, b) => {
            const timeA = new Date(a.date || a.createdAt || 0).getTime();
            const timeB = new Date(b.date || b.createdAt || 0).getTime();
            return timeA - timeB;
          });

          setSchedules(fetched);
          setIsLoadingSchedules(false);
        },
        (error) => {
          console.error('Error querying schedules collection:', error);
          setIsLoadingSchedules(false);
        }
      );
    } catch (error) {
      console.error('Error setting up schedules listener:', error);
      setIsLoadingSchedules(false);
    }

    return () => {
      if (unsubSchedules) unsubSchedules();
    };
  }, [firestore, selectedMineId]);

  // Calculate MSHA Form 7000-2 Statutory Deadline & Filing Verification
  const quarterlyReportDocs = requiredDocs.filter(
    (d) => d.mshaMineId === selectedMineId && d.category === 'Quarterly Reports'
  );
  const quarterlyFilingInfo = getNextQuarterlyReportDeadline(quarterlyReportDocs);

  // Calculate daysRemaining = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24))
  const calculateDaysRemaining = (expirationDateStr: string): number => {
    return Math.ceil(
      (new Date(expirationDateStr).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  // Build all tracked items with expirationDate / nextDueDate
  const allWatchlistItems: WatchlistItem[] = [];

  trainingDocs.forEach((docItem) => {
    const dueStr = docItem.expirationDate || docItem.nextDueDate;
    if (!dueStr) return;

    const daysRemaining = calculateDaysRemaining(dueStr);
    if (isNaN(daysRemaining)) return;

    allWatchlistItems.push({
      id: `training-${docItem.id}`,
      source: 'Training',
      title: docItem.documentTitle || 'Training Certificate',
      category: docItem.category || 'Training',
      minerName: docItem.minerName || undefined,
      dueDate: dueStr,
      daysRemaining,
    });
  });

  requiredDocs.forEach((docItem) => {
    let dueStr = docItem.expirationDate || docItem.nextDueDate;

    // For periodic inspection categories without an explicit expirationDate, derive renewal date
    if (
      !dueStr &&
      docItem.date &&
      (docItem.category?.includes('Pressure Vessel') ||
        docItem.category?.includes('Continuity') ||
        docItem.category?.includes('Quarterly'))
    ) {
      const baseDate = new Date(docItem.date);
      if (!isNaN(baseDate.getTime())) {
        const nextDue = new Date(baseDate);
        if (docItem.category?.includes('Quarterly')) {
          nextDue.setDate(nextDue.getDate() + 90);
        } else {
          nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
        dueStr = nextDue.toISOString().split('T')[0];
      }
    }

    if (!dueStr) return;

    const daysRemaining = calculateDaysRemaining(dueStr);
    if (isNaN(daysRemaining)) return;

    allWatchlistItems.push({
      id: `req-${docItem.id}`,
      source: 'Required Document',
      title: docItem.documentTitle || 'Compliance Document',
      category: docItem.category || 'Compliance',
      dueDate: dueStr,
      daysRemaining,
    });
  });

  // 2. Filter items by horizonFilter and sort strictly by daysRemaining ascending (most urgent first)
  const filteredWatchlistItems = allWatchlistItems
    .filter((item) => {
      if (horizonFilter === 'all') return true;
      return item.daysRemaining <= horizonFilter;
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 3. Submit Custom Event / Audit Schedule Form
  const handleAddSchedule = async (e: FormEvent) => {
    e.preventDefault();

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database is not available.',
      });
      return;
    }

    if (!titleInput.trim() || !assignedInput.trim() || !dateInput) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out Event Title, Date, and Assigned Person.',
      });
      return;
    }

    setIsSubmittingSchedule(true);

    const schedulesCollection = collection(firestore, 'schedules');

    const newSchedule = {
      companyId: 'comp_test_001',
      mshaMineId: selectedMineId,
      title: titleInput.trim(),
      category: categoryInput,
      date: dateInput,
      assignedTo: assignedInput.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(schedulesCollection, newSchedule);
      toast({
        title: 'Event Scheduled',
        description: `"${titleInput.trim()}" has been added to the compliance schedule.`,
      });
      setTitleInput('');
      setAssignedInput('');
      setDateInput(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      console.error('Error creating schedule event:', error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: schedulesCollection.path,
          operation: 'create',
          requestResourceData: newSchedule,
        })
      );
      toast({
        variant: 'destructive',
        title: 'Schedule Failed',
        description: error.message || 'Could not save scheduled event.',
      });
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Mark Complete / Delete handlers for Event Schedule List
  const handleMarkComplete = async (scheduleId: string, title: string) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'schedules', scheduleId);
      await deleteDoc(docRef);
      toast({
        title: 'Task Completed',
        description: `"${title}" has been marked complete and cleared from the active schedule.`,
      });
    } catch (error: any) {
      console.error('Error marking schedule complete:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not complete scheduled task.',
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, title: string) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'schedules', scheduleId);
      await deleteDoc(docRef);
      toast({
        title: 'Event Deleted',
        description: `"${title}" has been removed from the schedule.`,
      });
    } catch (error: any) {
      console.error('Error deleting scheduled event:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete scheduled event.',
      });
    }
  };

  const formatDateDisplay = (rawDate: string) => {
    if (!rawDate) return '—';
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? rawDate : parsed.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Scheduling & Compliance Calendar
          </h1>
          <p className="text-muted-foreground">
            Track upcoming certificate expirations, MSHA statutory filings, and safety tasks for {selectedMineLabel}.
          </p>
        </div>

        <ActiveMineBadge />
      </div>

      {/* Dedicated MSHA Statutory Reporting Card (Form 7000-2 Quarterly Filing Tracker) */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  MSHA Statutory Reporting
                </div>
                <CardTitle className="text-lg">
                  MSHA Form 7000-2 Quarterly Filing Tracker
                </CardTitle>
              </div>
            </div>

            {/* Active Statutory Filing Status Badge */}
            <div>
              {quarterlyFilingInfo.isFiled ? (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 px-3 py-1 text-xs"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Filed / Complete
                </Badge>
              ) : quarterlyFilingInfo.daysRemaining < 0 ? (
                <Badge variant="destructive" className="px-3 py-1 text-xs">
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  OVERDUE: Quarterly filing past due
                </Badge>
              ) : quarterlyFilingInfo.daysRemaining <= 15 ? (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/20 text-amber-400 border-amber-500/40 px-3 py-1 text-xs"
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Filing Window Open: Due in {quarterlyFilingInfo.daysRemaining} days
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-400 border-blue-500/40 px-3 py-1 text-xs"
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Upcoming Deadline: {quarterlyFilingInfo.deadlineFormatted} -{' '}
                  {quarterlyFilingInfo.daysRemaining} days remaining
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Active Reporting Period:{' '}
                <span className="text-primary font-semibold">
                  {quarterlyFilingInfo.quarterLabel}
                </span>{' '}
                ({quarterlyFilingInfo.periodDescription})
              </p>
              <p className="text-xs text-muted-foreground">
                Statutory Filing Deadline: <strong>{quarterlyFilingInfo.deadlineFormatted}</strong> •
                Mine ID: <strong>{selectedMineId}</strong>
                {quarterlyFilingInfo.isFiled && quarterlyFilingInfo.filedDocument
                  ? ` • Verified File: "${quarterlyFilingInfo.filedDocument.documentTitle}"`
                  : ' • Required under 30 CFR Part 50.30 (Quarterly Mine Employment and Coal Production Report)'}
              </p>
            </div>

            <Button asChild size="sm" className="shrink-0">
              <Link href="/dashboard/required-documents#quarterly-reports-card">
                <Upload className="mr-1.5 h-4 w-4" />
                Quick Upload
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Automated Expiration & Inspection Watchlist with Time-Horizon Filter Toggle */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle>Upcoming Expirations</CardTitle>
                <Badge variant="outline" className="ml-1">
                  {filteredWatchlistItems.length}{' '}
                  {filteredWatchlistItems.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>
              <CardDescription>
                Automated expiration watchlist for mine site <strong>{selectedMineId}</strong>.
              </CardDescription>
            </div>

            {/* Time-Horizon Segmented Control */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/40 p-1">
              <Button
                type="button"
                size="sm"
                variant={horizonFilter === 30 ? 'default' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setHorizonFilter(30)}
              >
                Next 30 Days (Urgent)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={horizonFilter === 60 ? 'default' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setHorizonFilter(60)}
              >
                Next 60 Days
              </Button>
              <Button
                type="button"
                size="sm"
                variant={horizonFilter === 90 ? 'default' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setHorizonFilter(90)}
              >
                Next 90 Days
              </Button>
              <Button
                type="button"
                size="sm"
                variant={horizonFilter === 'all' ? 'default' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setHorizonFilter('all')}
              >
                Show All (Audit View)
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingWatchlist ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Scanning compliance and training records...
            </div>
          ) : filteredWatchlistItems.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredWatchlistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.category}
                      </span>

                      {/* Visual Urgency Indicators */}
                      {item.daysRemaining <= 0 ? (
                        <Badge variant="destructive" className="shrink-0">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          OVERDUE ({Math.abs(item.daysRemaining)}d past due)
                        </Badge>
                      ) : item.daysRemaining <= 30 ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-amber-500/20 text-amber-400 border-amber-500/40"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Due in {item.daysRemaining} {item.daysRemaining === 1 ? 'Day' : 'Days'}
                        </Badge>
                      ) : item.daysRemaining <= 60 ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-blue-500/20 text-blue-400 border-blue-500/40"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Upcoming in {item.daysRemaining} Days
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Upcoming in {item.daysRemaining} Days
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm leading-snug">{item.title}</p>
                    {item.minerName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Miner: {item.minerName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <span>Due: {formatDateDisplay(item.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              All tracked documents are compliant and up to date for this window.
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* 3. Custom Event / Audit Scheduler Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle>Schedule Custom Event / Safety Audit</CardTitle>
          </div>
          <CardDescription>
            Plan upcoming MSHA inspection prep, dust sampling, safety meetings, or drills for mine site{' '}
            <strong>{selectedMineId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSchedule} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-title-input">Event / Task Title</Label>
                <Input
                  id="schedule-title-input"
                  placeholder="e.g., Q4 Respirable Dust Sampling"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-category-select">Category</Label>
                <select
                  id="schedule-category-select"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {SCHEDULE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-date-input">Date</Label>
                <Input
                  id="schedule-date-input"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-assigned-input">Assigned Person</Label>
                <Input
                  id="schedule-assigned-input"
                  placeholder="e.g., Sarah Jenkins"
                  value={assignedInput}
                  onChange={(e) => setAssignedInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmittingSchedule}>
              {isSubmittingSchedule ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Event
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 4. Event Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Compliance Events & Tasks</CardTitle>
          <CardDescription>
            Upcoming scheduled audits, meetings, and compliance tasks sorted chronologically for mine site{' '}
            <strong>{selectedMineId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event / Task Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Assigned Person</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSchedules && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading scheduled events...
                  </TableCell>
                </TableRow>
              )}
              {!isLoadingSchedules && schedules.length > 0 ? (
                schedules.map((eventItem) => (
                  <TableRow key={eventItem.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDateDisplay(eventItem.date)}
                    </TableCell>
                    <TableCell className="font-medium">{eventItem.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{eventItem.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {eventItem.assignedTo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkComplete(eventItem.id, eventItem.title)}
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Mark Complete
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSchedule(eventItem.id, eventItem.title)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoadingSchedules && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No custom compliance events scheduled for this mine site.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{schedules.length}</strong> of{' '}
            <strong>{schedules.length}</strong> scheduled events
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
