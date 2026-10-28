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
import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
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

  const activeCompanyId = profile?.companyId || 'comp_test_001';

  // Role-Based Navigation Guard & Soft-Lock Protection:
  // Render if profile?.role === "admin" OR user?.email === "jalanmcginnis@gmail.com" OR profile?.fullName === "Guest Supervisor"
  const isGuestSupervisor =
    Boolean(user?.isAnonymous) || profile?.fullName === 'Guest Supervisor';
  const isMasterAdminEmail =
    user?.email === 'jalanmcginnis@gmail.com' ||
    user?.email?.toLowerCase() === 'jalanmcginnis@gmail.com';
  const isAdmin =
    isGuestSupervisor ||
    isMasterAdminEmail ||
    profile?.role === 'admin' ||
    profile?.role?.toLowerCase() === 'admin';

  // Soft-lock developmental testing override toggle
  const [devBypassPlanLimits, setDevBypassPlanLimits] = useState<boolean>(false);

  // --- Card 1: "Manage Mine Sites" State ---
  const [firestoreMines, setFirestoreMines] = useState<MineDocument[]>([]);
  const [isLoadingMines, setIsLoadingMines] = useState<boolean>(true);
  const [mshaMineIdInput, setMshaMineIdInput] = useState<string>('');
  const [mineNameInput, setMineNameInput] = useState<string>('');
  const [stateInput, setStateInput] = useState<string>('');
  const [isSavingMine, setIsSavingMine] = useState<boolean>(false);

  // --- Card 2: "Company User Roster" State ---
  const [companyUsers, setCompanyUsers] = useState<CompanyUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [roleInput, setRoleInput] = useState<'examiner' | 'supervisor' | 'admin'>('examiner');
  const [assignedMinesInput, setAssignedMinesInput] = useState<string[]>(['13-00123']);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<CompanyUserRecord | null>(null);
  const [editUserRole, setEditUserRole] = useState<'examiner' | 'supervisor' | 'admin'>('examiner');
  const [editUserMines, setEditUserMines] = useState<string[]>([]);
  const [isUpdatingUser, setIsUpdatingUser] = useState<boolean>(false);

  // Subscribe to collection("mines") where("companyId", "==", profile?.companyId || "comp_test_001")
  useEffect(() => {
    if (!db || !activeCompanyId || !isAdmin) {
      setIsLoadingMines(false);
      return;
    }

    setIsLoadingMines(true);
    let unsubscribe: (() => void) | undefined;

    try {
      const minesQuery = query(
        collection(db, 'mines'),
        where('companyId', '==', activeCompanyId)
      );

      unsubscribe = onSnapshot(
        minesQuery,
        (snapshot) => {
          try {
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
                createdAt: data.createdAt || '',
              };
            });

            loadedMines.sort((a, b) => a.mineName.localeCompare(b.mineName));
            setFirestoreMines(loadedMines);
          } catch (parseErr) {
            console.error('Error parsing mines snapshot:', parseErr);
          } finally {
            setIsLoadingMines(false);
          }
        },
        (error) => {
          console.error('Error querying mines collection:', error);
          setIsLoadingMines(false);
        }
      );
    } catch (error) {
      console.error('Error setting up mines listener:', error);
      setIsLoadingMines(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeCompanyId, isAdmin]);

  // Subscribe to collection("user_profiles") where("companyId", "==", profile?.companyId || "comp_test_001")
  useEffect(() => {
    if (!db || !activeCompanyId || !isAdmin) {
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);
    let unsubscribe: (() => void) | undefined;

    try {
      const usersQuery = query(
        collection(db, 'user_profiles'),
        where('companyId', '==', activeCompanyId)
      );

      unsubscribe = onSnapshot(
        usersQuery,
        (snapshot) => {
          try {
            const loadedUsers: CompanyUserRecord[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                docId: docSnap.id,
                fullName: data.fullName || data.name || 'Unnamed User',
                email: data.email || '—',
                role: (data.role || 'examiner').toLowerCase(),
                assignedMines: Array.isArray(data.assignedMines)
                  ? data.assignedMines
                  : ['13-00123'],
                companyId: data.companyId || activeCompanyId,
                createdAt: data.createdAt || '',
              };
            });

            loadedUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
            setCompanyUsers(loadedUsers);
          } catch (parseErr) {
            console.error('Error parsing user_profiles snapshot:', parseErr);
          } finally {
            setIsLoadingUsers(false);
          }
        },
        (error) => {
          console.error('Error querying user_profiles collection:', error);
          setIsLoadingUsers(false);
        }
      );
    } catch (error) {
      console.error('Error setting up user_profiles listener:', error);
      setIsLoadingUsers(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeCompanyId, isAdmin]);

  // Display mines in table: if Firestore has documents, show them; otherwise show default fallback sites
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

  // Subscription Plan Limit Calculations:
  // Count existing mines in collection("mines") (or displayed active company mines) and existing users in collection("user_profiles")
  const existingMines = firestoreMines.length > 0 ? firestoreMines : displayedMines;
  const existingUsers = companyUsers;

  const isMineLimitReached = existingMines.length >= companyPlan.maxMines;
  const isUserLimitReached = existingUsers.length >= companyPlan.maxUsers;

  const disableAddMineButton =
    isSavingMine || (isMineLimitReached && !devBypassPlanLimits);
  const disableAddUserButton =
    isSavingUser || (isUserLimitReached && !devBypassPlanLimits);

  // --- Card 1 Handlers: Add / Delete / Toggle Mine Site ---
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

    if (!mshaMineId || !mineName || !state) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out MSHA Mine ID, Mine Name, and State.',
      });
      return;
    }

    setIsSavingMine(true);

    try {
      // If Firestore had no mines yet, seed existing default mines first so they remain available alongside the new site
      if (firestoreMines.length === 0) {
        for (const fallback of MINE_OPTIONS) {
          if (fallback.id !== mshaMineId) {
            try {
              await addDoc(collection(db, 'mines'), {
                mshaMineId: fallback.id,
                mineName: fallback.name,
                state: fallback.location || 'Primary',
                companyId: activeCompanyId,
                status: 'Active',
                active: true,
                createdAt: new Date().toISOString(),
              });
            } catch (seedErr) {
              console.error('Error seeding default mine site:', seedErr);
            }
          }
        }
      }

      await addDoc(collection(db, 'mines'), {
        mshaMineId,
        mineName,
        state,
        companyId: profile?.companyId || 'comp_test_001',
        status: 'Active',
        active: true,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Mine Site Added',
        description: `${mineName} (${mshaMineId}) has been added.`,
      });

      setMshaMineIdInput('');
      setMineNameInput('');
      setStateInput('');
    } catch (error: any) {
      console.error('Error adding mine site to collection("mines"):', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Add Mine Site',
        description: error?.message || 'Could not save mine site.',
      });
    } finally {
      setIsSavingMine(false);
    }
  };

  const handleDeleteMineSite = async (mine: MineDocument) => {
    try {
      if (mine.isFallback) {
        // Persist the remaining fallback mines to Firestore so the deleted one is removed
        const remaining = MINE_OPTIONS.filter((m) => m.id !== mine.mshaMineId);
        for (const fallback of remaining) {
          await addDoc(collection(db, 'mines'), {
            mshaMineId: fallback.id,
            mineName: fallback.name,
            state: fallback.location || 'Primary',
            companyId: activeCompanyId,
            status: 'Active',
            active: true,
            createdAt: new Date().toISOString(),
          });
        }
        toast({
          title: 'Mine Site Deleted',
          description: `${mine.mineName} (${mine.mshaMineId}) was removed.`,
        });
        return;
      }

      await deleteDoc(doc(db, 'mines', mine.docId));
      toast({
        title: 'Mine Site Deleted',
        description: `${mine.mineName} (${mine.mshaMineId}) has been deleted.`,
      });
    } catch (error: any) {
      console.error('Error deleting mine site from collection("mines"):', error);
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
        for (const fallback of MINE_OPTIONS) {
          const isTarget = fallback.id === mine.mshaMineId;
          await addDoc(collection(db, 'mines'), {
            mshaMineId: fallback.id,
            mineName: fallback.name,
            state: fallback.location || 'Primary',
            companyId: activeCompanyId,
            status: isTarget ? 'Inactive' : 'Active',
            active: !isTarget,
            createdAt: new Date().toISOString(),
          });
        }
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

  // --- Card 2 Handlers: Add / Edit / Delete Team Member ---
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
      const limitMsg =
        'User seat limit reached for your active plan. Upgrade to invite additional examiners.';
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
      assignedMinesInput.length > 0 ? assignedMinesInput : ['13-00123'];

    if (!fullName || !email || !password) {
      const missingMsg =
        'Please enter Full Name, Email, and Temporary Password.';
      setUserFormError(missingMsg);
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: missingMsg,
      });
      return;
    }

    if (password.length < 6) {
      const shortPassMsg = 'Password must be at least 6 characters.';
      setUserFormError(shortPassMsg);
      toast({
        variant: 'destructive',
        title: 'Invalid Password',
        description: shortPassMsg,
      });
      return;
    }

    setIsSavingUser(true);

    const secondaryAppName = `provisionUser-${Date.now()}`;
    let secondaryApp: FirebaseApp | null = null;

    try {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Create the Auth account in the background without affecting the active admin session
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const newUid = userCredential.user.uid;

      // 2. Write the profile to Firestore using the primary db instance and real UID
      await setDoc(doc(db, 'user_profiles', newUid), {
        email: email,
        fullName: fullName,
        role: role,
        companyId: profile?.companyId || 'comp_test_001',
        assignedMines: selectedMines,
        createdAt: new Date().toISOString(),
      });

      // 3. Clean up the secondary app instance
      await deleteApp(secondaryApp);
      secondaryApp = null;

      toast({
        title: 'Team Member Provisioned',
        description: `${fullName} (${role}) has been created and added to the company roster.`,
      });

      // Reset form and close modal if open
      setFullNameInput('');
      setEmailInput('');
      setPasswordInput('');
      setShowPassword(false);
      setRoleInput('examiner');
      setAssignedMinesInput(['13-00123']);
      setUserFormError(null);
      setIsAddUserModalOpen(false);
    } catch (error: any) {
      console.error('Failed to provision user:', error);

      if (secondaryApp) {
        try {
          if (getApps().some((a) => a.name === secondaryAppName)) {
            await deleteApp(secondaryApp);
          }
        } catch (cleanupErr) {
          console.error('Error cleaning up secondary Firebase app:', cleanupErr);
        }
      }

      let friendlyMessage =
        error?.message || 'Could not provision user account.';
      if (error?.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email already exists.';
      } else if (
        error?.code === 'auth/weak-password' ||
        password.length < 6
      ) {
        friendlyMessage = 'Password must be at least 6 characters.';
      }

      setUserFormError(friendlyMessage);
      toast({
        variant: 'destructive',
        title: 'Failed to Add Team Member',
        description: friendlyMessage,
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleAddTeamMember = handleAddUser;

  const handleInlineRoleUpdate = async (
    userRecord: CompanyUserRecord,
    nextRole: string
  ) => {
    try {
      await updateDoc(doc(db, 'user_profiles', userRecord.docId), {
        role: nextRole,
      });
      toast({
        title: 'Role Updated',
        description: `${userRecord.fullName}'s role was updated to ${nextRole}.`,
      });
    } catch (error: any) {
      console.error('Error updating role in user_profiles:', error);
      toast({
        variant: 'destructive',
        title: 'Role Update Failed',
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
    setEditUserMines(userRecord.assignedMines || ['13-00123']);
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
      console.error('Error updating user profile in user_profiles:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error?.message || 'Could not update team member.',
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
      console.error('Error deleting user from user_profiles:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error?.message || 'Could not remove team member.',
      });
    }
  };

  const renderRoleBadge = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized === 'admin') {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/40 capitalize">
          Admin
        </Badge>
      );
    }
    if (normalized === 'supervisor') {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-500/20 text-blue-400 border-blue-500/40 capitalize"
        >
          Supervisor
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="capitalize">
        Examiner
      </Badge>
    );
  };

  const formatDateAdded = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString();
  };

  if (authLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-destructive/50 max-w-xl mx-auto mt-10">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-6 w-6" />
            <CardTitle>Administrator Access Required</CardTitle>
          </div>
          <CardDescription>
            This Administration page is restricted to users with the <strong>Admin</strong> role or Guest Supervisors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your current role is <strong className="capitalize">{profile?.role || 'Examiner'}</strong>.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Company Admin Settings
            </h1>
          </div>
          <p className="text-muted-foreground">
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

      {/* Company Subscription Plan & Usage Overview Bar */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/20 text-primary border-primary/40 px-3 py-1 text-xs font-mono">
              Plan: {companyPlan.planTier}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs capitalize"
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
            {/* Soft-Lock Protection: Admin / Guest Testing Override */}
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

            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/upgrade">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 1: "Manage Mine Sites" */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mountain className="h-5 w-5 text-primary" />
                <CardTitle>Manage Mine Sites</CardTitle>
              </div>
              <CardDescription>
                Add or remove MSHA Mine Sites for your company. Changes immediately update the global Active Mine dropdown.
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
          {/* Plan Limit Banner for Mine Sites */}
          {isMineLimitReached && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">
                    {`Mine site limit reached for your active plan (${companyPlan.planTier}). Upgrade to add more locations.`}
                  </p>
                  {devBypassPlanLimits && (
                    <p className="text-xs text-muted-foreground">
                      Admin / Dev Testing Override is enabled — adding locations is unlocked for testing.
                    </p>
                  )}
                </div>
              </div>
              <Button asChild size="sm" variant="secondary" className="shrink-0">
                <Link href="/dashboard/upgrade">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          )}

          {/* Add Mine Site Form */}
          <form
            onSubmit={handleAddMineSite}
            className="rounded-lg border bg-muted/30 p-4 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="msha-mine-id-input">MSHA Mine ID</Label>
                <Input
                  id="msha-mine-id-input"
                  type="text"
                  placeholder="e.g., 13-00789"
                  value={mshaMineIdInput}
                  onChange={(e) => setMshaMineIdInput(e.target.value)}
                  disabled={disableAddMineButton}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mine-name-input">Mine Name</Label>
                <Input
                  id="mine-name-input"
                  type="text"
                  placeholder="e.g., East Plant"
                  value={mineNameInput}
                  onChange={(e) => setMineNameInput(e.target.value)}
                  disabled={disableAddMineButton}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mine-state-input">State</Label>
                <Input
                  id="mine-state-input"
                  type="text"
                  placeholder="e.g., IA"
                  value={stateInput}
                  onChange={(e) => setStateInput(e.target.value)}
                  disabled={disableAddMineButton}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={disableAddMineButton}>
              {isSavingMine ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Mine Site...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Mine Site
                </>
              )}
            </Button>
          </form>

          {/* Existing Mines Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MSHA Mine ID</TableHead>
                  <TableHead>Mine Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMines ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      Loading company mine sites...
                    </TableCell>
                  </TableRow>
                ) : displayedMines.length > 0 ? (
                  displayedMines.map((mine) => {
                    const isCurrentlySelected = selectedMineId === mine.mshaMineId;
                    return (
                      <TableRow key={mine.docId}>
                        <TableCell className="font-mono font-semibold">
                          {mine.mshaMineId}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{mine.mineName}</span>
                            {isCurrentlySelected && (
                              <Badge variant="secondary" className="text-[10px]">
                                Active in Header
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {mine.state}
                          </span>
                        </TableCell>
                        <TableCell>
                          {mine.active ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {mine.status || 'Active'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
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
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteMineSite(mine)}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No mine sites found. Add a mine site above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Card 2: "Company User Roster" */}
      <Card>
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
                Add Team Member / Create User
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Plan Limit Banner for User Roster */}
          {isUserLimitReached && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">
                    User seat limit reached for your active plan. Upgrade to invite additional examiners.
                  </p>
                  {devBypassPlanLimits && (
                    <p className="text-xs text-muted-foreground">
                      Admin / Dev Testing Override is enabled — adding team members is unlocked for testing.
                    </p>
                  )}
                </div>
              </div>
              <Button asChild size="sm" variant="secondary" className="shrink-0">
                <Link href="/dashboard/upgrade">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          )}

          {/* Add Team Member Form */}
          <form
            onSubmit={handleAddUser}
            className="rounded-lg border bg-muted/30 p-4 space-y-4"
          >
            {userFormError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{userFormError}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="roster-fullname-input">Full Name</Label>
                <Input
                  id="roster-fullname-input"
                  type="text"
                  placeholder="e.g., Sarah Jenkins"
                  value={fullNameInput}
                  onChange={(e) => {
                    setFullNameInput(e.target.value);
                    if (userFormError) setUserFormError(null);
                  }}
                  disabled={disableAddUserButton}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roster-email-input">Email</Label>
                <Input
                  id="roster-email-input"
                  type="email"
                  placeholder="e.g., sarah.jenkins@company.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (userFormError) setUserFormError(null);
                  }}
                  disabled={disableAddUserButton}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roster-password-input">Temporary Password</Label>
                <div className="relative">
                  <Input
                    id="roster-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter temporary password (min 6 chars)"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (userFormError) setUserFormError(null);
                    }}
                    disabled={disableAddUserButton}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={disableAddUserButton}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roster-role-select">Role</Label>
                <select
                  id="roster-role-select"
                  value={roleInput}
                  onChange={(e) =>
                    setRoleInput(
                      e.target.value as 'examiner' | 'supervisor' | 'admin'
                    )
                  }
                  disabled={disableAddUserButton}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="examiner">examiner</option>
                  <option value="supervisor">supervisor</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            {/* Assigned Mines Checkboxes */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned MSHA Mine Sites
              </Label>
              <div className="flex flex-wrap gap-4 rounded-md border bg-background p-3">
                {mineOptions.map((mine) => {
                  const checked = assignedMinesInput.includes(mine.id);
                  return (
                    <div key={mine.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`roster-mine-check-${mine.id}`}
                        checked={checked}
                        disabled={disableAddUserButton}
                        onCheckedChange={() => toggleAssignedMineInput(mine.id)}
                      />
                      <Label
                        htmlFor={`roster-mine-check-${mine.id}`}
                        className="text-xs sm:text-sm font-normal cursor-pointer"
                      >
                        {mine.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button type="submit" disabled={disableAddUserButton}>
              {isSavingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Team Member...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Team Member
                </>
              )}
            </Button>
          </form>

          {/* Company Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Mines</TableHead>
                  <TableHead className="hidden md:table-cell">Date Added</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {renderRoleBadge(u.role)}
                          <select
                            aria-label={`Change role for ${u.fullName}`}
                            value={
                              ['admin', 'supervisor', 'examiner'].includes(
                                u.role.toLowerCase()
                              )
                                ? u.role.toLowerCase()
                                : 'examiner'
                            }
                            onChange={(e) =>
                              handleInlineRoleUpdate(u, e.target.value)
                            }
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
                              const matched = mineOptions.find(
                                (m) => m.id === mineId
                              );
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
                            <span className="text-xs text-muted-foreground">
                              13-00123
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
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
                      No team members found in company roster. Use the form above to add a team member.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{companyUsers.length}</strong> of{' '}
            <strong>{companyPlan.maxUsers}</strong> allowed team{' '}
            {companyUsers.length === 1 ? 'member' : 'members'} in company{' '}
            <span className="font-mono">{activeCompanyId}</span>
          </div>
        </CardFooter>
      </Card>

      {/* Add Team Member / Create User Modal */}
      <Dialog
        open={isAddUserModalOpen}
        onOpenChange={(open) => {
          setIsAddUserModalOpen(open);
          if (!open) setUserFormError(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Team Member / Create User</DialogTitle>
            <DialogDescription>
              Provision a new user account with a temporary password and assign their role and MSHA mine sites. Your active admin session will remain logged in.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4 py-2">
            {userFormError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{userFormError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="modal-add-fullname">Full Name</Label>
              <Input
                id="modal-add-fullname"
                type="text"
                placeholder="e.g., Sarah Jenkins"
                value={fullNameInput}
                onChange={(e) => {
                  setFullNameInput(e.target.value);
                  if (userFormError) setUserFormError(null);
                }}
                disabled={disableAddUserButton}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-add-email">Email</Label>
              <Input
                id="modal-add-email"
                type="email"
                placeholder="e.g., sarah.jenkins@company.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (userFormError) setUserFormError(null);
                }}
                disabled={disableAddUserButton}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-add-password">Temporary Password</Label>
              <div className="relative">
                <Input
                  id="modal-add-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter temporary password (min 6 chars)"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (userFormError) setUserFormError(null);
                  }}
                  disabled={disableAddUserButton}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={disableAddUserButton}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-add-role">Role</Label>
              <select
                id="modal-add-role"
                value={roleInput}
                onChange={(e) =>
                  setRoleInput(
                    e.target.value as 'examiner' | 'supervisor' | 'admin'
                  )
                }
                disabled={disableAddUserButton}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="examiner">examiner</option>
                <option value="supervisor">supervisor</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Assigned MSHA Mine Sites</Label>
              <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                {mineOptions.map((mine) => {
                  const checked = assignedMinesInput.includes(mine.id);
                  return (
                    <div key={mine.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`modal-add-mine-${mine.id}`}
                        checked={checked}
                        disabled={disableAddUserButton}
                        onCheckedChange={() => toggleAssignedMineInput(mine.id)}
                      />
                      <Label
                        htmlFor={`modal-add-mine-${mine.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {mine.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setUserFormError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={disableAddUserButton}>
                {isSavingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating User...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update role and assigned MSHA mine sites for{' '}
              <strong>{editingUser?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUserModal} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="modal-edit-role">Role</Label>
              <select
                id="modal-edit-role"
                value={editUserRole}
                onChange={(e) =>
                  setEditUserRole(
                    e.target.value as 'examiner' | 'supervisor' | 'admin'
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="examiner">examiner</option>
                <option value="supervisor">supervisor</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Assigned MSHA Mine Sites</Label>
              <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                {mineOptions.map((mine) => {
                  const checked = editUserMines.includes(mine.id);
                  return (
                    <div key={mine.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`modal-edit-mine-${mine.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleEditUserMine(mine.id)}
                      />
                      <Label
                        htmlFor={`modal-edit-mine-${mine.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {mine.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingUser}>
                {isUpdatingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
