'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import {
  Building2,
  Mountain,
  Users,
  Plus,
  Trash2,
  Power,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Pencil,
  CheckCircle2,
  Loader2,
  MapPin,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { useAuth, DEFAULT_COMPANY_PLAN } from '@/context/AuthContext';
import { useActiveMine, MINE_OPTIONS } from '@/context/MineContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MineDocument {
  docId: string;
  mshaMineId: string;
  mineName: string;
  state: string;
  companyId: string;
  status: string;
  active: boolean;
  idType?: 'mine' | 'contractor';
  createdAt?: string;
  isFallback?: boolean;
}

interface CompanyUserRecord {
  docId: string;
  fullName: string;
  email: string;
  role: 'admin' | 'supervisor' | 'examiner' | string;
  assignedMines: string[];
  companyId: string;
  createdAt?: string;
}

export default function AdministrationPage() {
  const {
    user,
    profile,
    companyPlan = DEFAULT_COMPANY_PLAN,
    loading: authLoading,
  } = useAuth();
  const { selectedMineId, setSelectedMineId, mineOptions } = useActiveMine();
  const { toast } = useToast();

  // Consistent Company ID resolution
  const activeCompanyId = profile?.companyId || 'comp_test_001';

  // Role verification
  const isGuestSupervisor =
    Boolean(user?.isAnonymous) || profile?.fullName === 'Guest Supervisor';
  const isMasterAdminEmail =
    user?.email?.toLowerCase() === 'jalanmcginnis@gmail.com';
  const isAdmin =
    isGuestSupervisor ||
    isMasterAdminEmail ||
    profile?.role?.toLowerCase() === 'admin';

  // Bypass toggle
  const [devBypassPlanLimits, setDevBypassPlanLimits] = useState<boolean>(false);

  // Mine Sites State
  const [firestoreMines, setFirestoreMines] = useState<MineDocument[]>([]);
  const [isLoadingMines, setIsLoadingMines] = useState<boolean>(true);
  const [idTypeInput, setIdTypeInput] = useState<'mine' | 'contractor'>('mine');
  const [mshaMineIdInput, setMshaMineIdInput] = useState<string>('');
  const [mineNameInput, setMineNameInput] = useState<string>('');
  const [stateInput, setStateInput] = useState<string>('');
  const [isSavingMine, setIsSavingMine] = useState<boolean>(false);

  // User Roster State
  const [companyUsers, setCompanyUsers] = useState<CompanyUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [roleInput, setRoleInput] = useState<'examiner' | 'supervisor' | 'admin'>('examiner');
  const [assignedMinesInput, setAssignedMinesInput] = useState<string[]>([]);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<CompanyUserRecord | null>(null);
  const [editUserRole, setEditUserRole] = useState<'examiner' | 'supervisor' | 'admin'>('examiner');
  const [editUserMines, setEditUserMines] = useState<string[]>([]);
  const [isUpdatingUser, setIsUpdatingUser] = useState<boolean>(false);

  // Initialize assigned mines default to current active mine
  useEffect(() => {
    if (selectedMineId && assignedMinesInput.length === 0) {
      setAssignedMinesInput([selectedMineId]);
    }
  }, [selectedMineId]);

  // Subscribe to mines collection
  useEffect(() => {
    if (!db || !activeCompanyId || !isAdmin) {
      setIsLoadingMines(false);
      return;
    }

    setIsLoadingMines(true);
    const minesQuery = query(
      collection(db, 'mines'),
      where('companyId', '==', activeCompanyId)
    );

    const unsubscribe = onSnapshot(
      minesQuery,
      (snapshot) => {
        const loadedMines: MineDocument[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const mshaMineId = String(
            data.mshaMineId || data.mineId || data.id || docSnap.id
          ).trim();
          const mineName = String(
            data.mineName || data.name || mshaMineId
          ).trim();
          const statusStr = String(data.status || 'Active');
          const isActive =
            data.active !== false && statusStr.toLowerCase() !== 'inactive';

          return {
            docId: docSnap.id,
            mshaMineId,
            mineName,
            state: data.state || data.location || data.stateLocation || '—',
            companyId: data.companyId || activeCompanyId,
            status: statusStr,
            active: isActive,
            idType: data.idType === 'contractor' ? 'contractor' : 'mine',
            createdAt: data.createdAt || '',
          };
        });

        loadedMines.sort((a, b) => a.mineName.localeCompare(b.mineName));
        setFirestoreMines(loadedMines);
        setIsLoadingMines(false);
      },
      (error) => {
        console.error('Error querying mines collection:', error);
        setIsLoadingMines(false);
      }
    );

    return () => unsubscribe();
  }, [activeCompanyId, isAdmin]);

  // Subscribe to user_profiles collection
  useEffect(() => {
    if (!db || !activeCompanyId || !isAdmin) {
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);
    const usersQuery = query(
      collection(db, 'user_profiles'),
      where('companyId', '==', activeCompanyId)
    );

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const loadedUsers: CompanyUserRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            docId: docSnap.id,
            fullName: data.fullName || data.name || 'Unnamed User',
            email: data.email || '—',
            role: (data.role || 'examiner').toLowerCase(),
            assignedMines: Array.isArray(data.assignedMines)
              ? data.assignedMines
              : selectedMineId ? [selectedMineId] : [],
            companyId: data.companyId || activeCompanyId,
            createdAt: data.createdAt || '',
          };
        });

        loadedUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setCompanyUsers(loadedUsers);
        setIsLoadingUsers(false);
      },
      (error) => {
        console.error('Error querying user_profiles collection:', error);
        setIsLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [activeCompanyId, isAdmin, selectedMineId]);

  // Displayed mines fallback calculation
  const displayedMines: MineDocument[] =
    firestoreMines.length > 0
      ? firestoreMines
      : MINE_OPTIONS.map((m) => ({
          docId: `fallback-${m.id}`,
          mshaMineId: m.id,
          mineName: m.name,
          state: m.location || 'Default Site',
          companyId: activeCompanyId,
          status: 'Active',
          active: true,
          isFallback: true,
        }));

  const existingMines = firestoreMines.length > 0 ? firestoreMines : displayedMines;
  const existingUsers = companyUsers;

  const isMineLimitReached = existingMines.length >= companyPlan.maxMines;
  const isUserLimitReached = existingUsers.length >= companyPlan.maxUsers;

  const planSummary = `${companyPlan.label || companyPlan.planTier}: ${existingUsers.length}/${companyPlan.maxUsers} users, ${existingMines.length}/${companyPlan.maxMines} mines${companyPlan.examsOnly ? ' · exams-only trial' : ''}`;

  const disableAddMineButton =
    isSavingMine || (isMineLimitReached && !devBypassPlanLimits);
  const disableAddUserButton =
    isSavingUser || (isUserLimitReached && !devBypassPlanLimits);

  // --- Handlers: Mine Sites ---
  const handleAddMineSite = async (e: FormEvent) => {
    e.preventDefault();

    if (isMineLimitReached && !devBypassPlanLimits) {
      toast({
        variant: 'destructive',
        title: 'Mine Site Limit Reached',
        description: `Mine site limit reached for your active plan (${companyPlan.planTier}). Upgrade to add more locations.`,
      });
      return;
    }

    const mshaMineId = mshaMineIdInput.trim();
    const mineName = mineNameInput.trim();
    const state = stateInput.trim();

    if (!mshaMineId || !mineName || (idTypeInput === 'mine' && !state)) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: idTypeInput === 'contractor'
          ? 'Please enter a contractor ID and name.'
          : 'Please fill out MSHA Mine ID, Mine Name, and State.',
      });
      return;
    }

    if (idTypeInput === 'contractor' && (mshaMineId.length < 3 || mshaMineId.length > 5)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Contractor ID',
        description: 'Contractor ID must be 3 to 5 characters.',
      });
      return;
    }

    setIsSavingMine(true);

    try {
      await addDoc(collection(db, 'mines'), {
        mshaMineId: idTypeInput === 'contractor' ? mshaMineId.toUpperCase() : mshaMineId,
        mineName,
        state: state || '—',
        idType: idTypeInput,
        companyId: activeCompanyId,
        status: 'Active',
        active: true,
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      });

      toast({
        title: idTypeInput === 'contractor' ? 'Contractor ID Added' : 'Mine Site Added',
        description: `${mineName} (${mshaMineId}) has been added.`,
      });

      setMshaMineIdInput('');
      setMineNameInput('');
      setStateInput('');
    } catch (error: any) {
      console.error('Error adding mine site:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Save',
        description: error?.message || 'Could not save mine site.',
      });
    } finally {
      setIsSavingMine(false);
    }
  };

  const handleDeleteMineSite = async (mine: MineDocument) => {
    try {
      if (mine.isFallback) {
        toast({
          title: 'Default Mine',
          description: 'Default placeholder sites cannot be deleted until customized in Firestore.',
        });
        return;
      }

      await deleteDoc(doc(db, 'mines', mine.docId));
      toast({
        title: 'Mine Site Deleted',
        description: `${mine.mineName} (${mine.mshaMineId}) has been deleted.`,
      });
    } catch (error: any) {
      console.error('Error deleting mine site:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error?.message || 'Could not delete mine site.',
      });
    }
  };

  const handleToggleMineStatus = async (mine: MineDocument) => {
    try {
      if (mine.isFallback) {
        // First-time toggle converts fallback to a real Firestore doc
        await addDoc(collection(db, 'mines'), {
          mshaMineId: mine.mshaMineId,
          mineName: mine.mineName,
          state: mine.state,
          companyId: activeCompanyId,
          status: 'Inactive',
          active: false,
          createdAt: new Date().toISOString(),
          serverCreatedAt: serverTimestamp(),
        });
        return;
      }

      const nextActive = !mine.active;
      await updateDoc(doc(db, 'mines', mine.docId), {
        status: nextActive ? 'Active' : 'Inactive',
        active: nextActive,
      });

      toast({
        title: 'Mine Status Updated',
        description: `${mine.mineName} is now ${nextActive ? 'Active' : 'Inactive'}.`,
      });
    } catch (error: any) {
      console.error('Error updating mine status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error?.message || 'Could not update mine status.',
      });
    }
  };

  // --- Handlers: User Provisioning ---
  const toggleAssignedMineInput = (mineId: string) => {
    setAssignedMinesInput((prev) =>
      prev.includes(mineId) ? prev.filter((id) => id !== mineId) : [...prev, mineId]
    );
  };

  const toggleEditUserMine = (mineId: string) => {
    setEditUserMines((prev) =>
      prev.includes(mineId) ? prev.filter((id) => id !== mineId) : [...prev, mineId]
    );
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    if (isUserLimitReached && !devBypassPlanLimits) {
      const limitMsg = 'User seat limit reached for your active plan.';
      setUserFormError(limitMsg);
      toast({
        variant: 'destructive',
        title: 'User Seat Limit Reached',
        description: limitMsg,
      });
      return;
    }

    const fullName = fullNameInput.trim();
    const email = emailInput.trim();
    const password = passwordInput;
    const role = roleInput;
    const selectedMines =
      assignedMinesInput.length > 0 ? assignedMinesInput : (selectedMineId ? [selectedMineId] : []);

    if (!fullName || !email || !password) {
      const missingMsg = 'Please enter Full Name, Email, and Temporary Password.';
      setUserFormError(missingMsg);
      return;
    }

    if (password.length < 6) {
      const lengthMsg = 'Temporary password must be at least 6 characters.';
      setUserFormError(lengthMsg);
      return;
    }

    setIsSavingUser(true);

    let secondaryApp: FirebaseApp | null = null;
    const secondaryAppName = `ProvisionUser_${Date.now()}`;

    try {
      // Create an isolated secondary app to avoid logging out the current admin session
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const newUser = userCredential.user;

      // Ensure companyId is strictly consistent with activeCompanyId
      await setDoc(doc(db, 'user_profiles', newUser.uid), {
        fullName,
        email,
        role,
        assignedMines: selectedMines,
        companyId: activeCompanyId,
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      });

      toast({
        title: 'Team Member Created',
        description: `${fullName} (${role}) has been created and added to the company roster.`,
      });

      setFullNameInput('');
      setEmailInput('');
      setPasswordInput('');
      setShowPassword(false);
      setRoleInput('examiner');
      setAssignedMinesInput(selectedMineId ? [selectedMineId] : []);
      setUserFormError(null);
      setIsAddUserModalOpen(false);
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      const message =
        error?.code === 'auth/email-already-in-use'
          ? 'That email is already registered.'
          : error?.message || 'Could not create the team member.';
      setUserFormError(message);
      toast({
        variant: 'destructive',
        title: 'Create User Failed',
        description: message,
      });
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (cleanupErr) {
          console.error('Error cleaning up secondary Firebase app instance:', cleanupErr);
        }
      }
      setIsSavingUser(false);
    }
  };

  const handleInlineRoleUpdate = async (
    userRecord: CompanyUserRecord,
    newRole: string
  ) => {
    try {
      await updateDoc(doc(db, 'user_profiles', userRecord.docId), {
        role: newRole,
      });
      toast({
        title: 'Role Updated',
        description: `${userRecord.fullName} is now ${newRole}.`,
      });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error?.message || 'Could not update role.',
      });
    }
  };

  const openEditUserModal = (userRecord: CompanyUserRecord) => {
    setEditingUser(userRecord);
    const normalizedRole = ['admin', 'supervisor', 'examiner'].includes(
      userRecord.role.toLowerCase()
    )
      ? (userRecord.role.toLowerCase() as 'admin' | 'supervisor' | 'examiner')
      : 'examiner';
    setEditUserRole(normalizedRole);
    setEditUserMines(userRecord.assignedMines || (selectedMineId ? [selectedMineId] : []));
  };

  const handleSaveUserModal = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      await updateDoc(doc(db, 'user_profiles', editingUser.docId), {
        role: editUserRole,
        assignedMines: editUserMines,
      });
      toast({
        title: 'Team Member Updated',
        description: `Saved role and assigned mines for ${editingUser.fullName}.`,
      });
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error?.message || 'Could not save changes.',
      });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (userRecord: CompanyUserRecord) => {
    try {
      await deleteDoc(doc(db, 'user_profiles', userRecord.docId));
      toast({
        title: 'Team Member Removed',
        description: `${userRecord.fullName} has been removed from the roster.`,
      });
    } catch (error: any) {
      console.error('Error deleting user profile:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error?.message || 'Could not remove team member.',
      });
    }
  };

  const formatDateAdded = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const renderRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'admin') {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/40">
          admin
        </Badge>
      );
    }
    if (r === 'supervisor') {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/20 text-amber-500 border-amber-500/40"
        >
          supervisor
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="capitalize">
        {r || 'examiner'}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">
          This Administration page is restricted to users with the <strong>Admin</strong> role or Guest Supervisors.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-2 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage MSHA mine sites, user roster, and subscription limits for{' '}
            <span className="font-mono text-xs font-semibold text-foreground">
              {activeCompanyId}
            </span>
            .
          </p>
        </div>

        <Badge variant="secondary" className="px-3 py-1 text-xs w-fit">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
          {isGuestSupervisor ? 'Guest Supervisor (Admin)' : 'Administrator'}
        </Badge>
      </div>

      {/* Plan Usage Overview Bar */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/20 text-primary border-primary/40 px-3 py-1 text-xs font-mono">
              Plan: {companyPlan.planTier}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs capitalize"
            >
              Status: {companyPlan.subscriptionStatus}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              Mine Sites: {existingMines.length} / {companyPlan.maxMines}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              User Seats: {existingUsers.length} / {companyPlan.maxUsers}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2 rounded-md border bg-muted/30 px-3 py-1.5">
              <Unlock className="h-3.5 w-3.5 text-primary" />
              <Label
                htmlFor="dev-bypass-limits-toggle"
                className="text-xs font-medium cursor-pointer"
              >
                Admin / Dev Testing Override
              </Label>
              <Switch
                id="dev-bypass-limits-toggle"
                checked={devBypassPlanLimits}
                onCheckedChange={setDevBypassPlanLimits}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {planSummary}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 1: Manage Mine Sites */}
      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mountain className="h-5 w-5 text-primary" />
                <CardTitle>Manage Mine Sites</CardTitle>
              </div>
              <CardDescription>
                Add, activate, or remove MSHA mine sites and contractor IDs for your company.
              </CardDescription>
            </div>
            <Badge
              variant={isMineLimitReached ? 'destructive' : 'outline'}
              className="w-fit font-mono text-xs"
            >
              {existingMines.length} / {companyPlan.maxMines} Mine Sites Used
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleAddMineSite} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>ID Type</Label>
                <select
                  value={idTypeInput}
                  onChange={(e) =>
                    setIdTypeInput(e.target.value as 'mine' | 'contractor')
                  }
                  disabled={disableAddMineButton}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="mine">Mine</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="msha-id">
                  {idTypeInput === 'contractor' ? 'Contractor ID' : 'MSHA Mine ID'}
                </Label>
                <Input
                  id="msha-id"
                  placeholder={idTypeInput === 'contractor' ? 'e.g. ABC' : 'e.g. 13-00123'}
                  value={mshaMineIdInput}
                  onChange={(e) => setMshaMineIdInput(e.target.value)}
                  disabled={disableAddMineButton}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mine-name">
                  {idTypeInput === 'contractor' ? 'Contractor Name' : 'Mine Name'}
                </Label>
                <Input
                  id="mine-name"
                  placeholder="Site name"
                  value={mineNameInput}
                  onChange={(e) => setMineNameInput(e.target.value)}
                  disabled={disableAddMineButton}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  {idTypeInput === 'contractor' ? 'State (optional)' : 'State'}
                </Label>
                <Input
                  id="state"
                  placeholder="e.g. IA"
                  value={stateInput}
                  onChange={(e) => setStateInput(e.target.value)}
                  disabled={disableAddMineButton}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={disableAddMineButton}>
                {isSavingMine ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add {idTypeInput === 'contractor' ? 'Contractor ID' : 'Mine Site'}
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="min-w-0 max-w-full overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Mine Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMines ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Loading mine sites...
                    </TableCell>
                  </TableRow>
                ) : displayedMines.length > 0 ? (
                  displayedMines.map((mine) => {
                    const isCurrentlySelected = selectedMineId === mine.mshaMineId;
                    return (
                      <TableRow key={mine.docId}>
                        <TableCell>{mine.idType === 'contractor' ? 'Contractor' : 'Mine'}</TableCell>
                        <TableCell className="font-mono font-semibold">
                          {mine.mshaMineId}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {mine.mineName}
                            {isCurrentlySelected && (
                              <Badge variant="secondary" className="text-[10px]">
                                Active Site
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {mine.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={mine.active ? 'secondary' : 'outline'}
                            className={mine.active ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : ''}
                          >
                            {mine.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {mine.active && !isCurrentlySelected && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedMineId(mine.mshaMineId)}
                              >
                                Select Site
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleMineStatus(mine)}
                            >
                              <Power className="mr-1.5 h-3.5 w-3.5" />
                              {mine.active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMineSite(mine)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No mine sites found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Card 2: Company User Roster */}
      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Company User Roster</CardTitle>
              </div>
              <CardDescription>
                Add team members to your company and manage user roles (Examiner, Supervisor, Admin) and assigned MSHA mine sites.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={isUserLimitReached ? 'destructive' : 'outline'}
                className="w-fit font-mono text-xs"
              >
                {existingUsers.length} / {companyPlan.maxUsers} User Seats Used
              </Badge>
              <Button
                type="button"
                size="sm"
                disabled={disableAddUserButton}
                onClick={() => {
                  setUserFormError(null);
                  setIsAddUserModalOpen(true);
                }}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add Team Member
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isUserLimitReached && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-amber-500">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">
                    User seat limit reached for your active plan.
                  </p>
                  {devBypassPlanLimits && (
                    <p className="text-xs text-muted-foreground">
                      Admin / Dev Testing Override is enabled — adding team members is unlocked.
                    </p>
                  )}
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/billing">
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block min-w-0 max-w-full overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Mines</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Loading company user roster...
                    </TableCell>
                  </TableRow>
                ) : companyUsers.length > 0 ? (
                  companyUsers.map((u) => (
                    <TableRow key={u.docId}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {renderRoleBadge(u.role)}
                          <select
                            aria-label={`Change role for ${u.fullName}`}
                            value={
                              ['admin', 'supervisor', 'examiner'].includes(u.role.toLowerCase())
                                ? u.role.toLowerCase()
                                : 'examiner'
                            }
                            onChange={(e) => handleInlineRoleUpdate(u, e.target.value)}
                            className="h-7 rounded border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="examiner">examiner</option>
                            <option value="supervisor">supervisor</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.assignedMines && u.assignedMines.length > 0 ? (
                            u.assignedMines.map((mineId) => {
                              const matched = mineOptions.find((m) => m.id === mineId);
                              return (
                                <Badge
                                  key={mineId}
                                  variant="secondary"
                                  className="font-mono text-[11px]"
                                >
                                  {matched ? `${matched.name} (${mineId})` : mineId}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateAdded(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditUserModal(u)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No team members found in company roster.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {isLoadingUsers ? (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                Loading company user roster...
              </div>
            ) : companyUsers.length > 0 ? (
              companyUsers.map((u) => (
                <div key={u.docId} className="rounded-lg border bg-card p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{u.fullName}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <div className="shrink-0">{renderRoleBadge(u.role)}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Role
                    </div>
                    <select
                      aria-label={`Change role for ${u.fullName}`}
                      value={
                        ['admin', 'supervisor', 'examiner'].includes(u.role.toLowerCase())
                          ? u.role.toLowerCase()
                          : 'examiner'
                      }
                      onChange={(e) => handleInlineRoleUpdate(u, e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="examiner">examiner</option>
                      <option value="supervisor">supervisor</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Assigned Mines
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {u.assignedMines && u.assignedMines.length > 0 ? (
                        u.assignedMines.map((mineId) => {
                          const matched = mineOptions.find((m) => m.id === mineId);
                          return (
                            <Badge
                              key={mineId}
                              variant="secondary"
                              className="font-mono text-[11px]"
                            >
                              {matched ? `${matched.name} (${mineId})` : mineId}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateAdded(u.createdAt)}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5"
                        onClick={() => openEditUserModal(u)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUser(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                No team members found in company roster.
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <div className="text-