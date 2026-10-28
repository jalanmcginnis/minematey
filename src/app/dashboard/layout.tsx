'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  PanelLeft,
  ShieldCheck,
  Wrench,
  CalendarDays,
  LogOut,
  Loader2,
  FileText,
  BookUser,
  CreditCard,
  Sparkles,
  Mountain,
  User as UserIcon,
  Settings,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useActiveMine } from '@/context/MineContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, auth } = useAuth();
  const { selectedMineId, setSelectedMineId, mineOptions } = useActiveMine();
  const router = useRouter();

  const canAccessAdmin =
    loading ||
    profile?.role === 'admin' ||
    profile?.role?.toLowerCase() === 'admin' ||
    user?.email === 'jalanmcginnis@gmail.com' ||
    user?.email?.toLowerCase() === 'jalanmcginnis@gmail.com' ||
    profile?.fullName === 'Guest Supervisor' ||
    Boolean(user?.isAnonymous);

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/dashboard/workplace-exams', icon: ShieldCheck, label: 'Workplace Exams' },
    { href: '/dashboard/equipment-exams', icon: Wrench, label: 'Equipment Exams' },
    { href: '/dashboard/required-documents', icon: FileText, label: 'Required Documents' },
    { href: '/dashboard/training-documents', icon: BookUser, label: 'Training Documents' },
    { href: '/dashboard/scheduling', icon: CalendarDays, label: 'Scheduling' },
    ...(canAccessAdmin
      ? [{ href: '/admin', icon: Settings, label: 'Admin Settings' }]
      : []),
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const displayIdentity = user?.isAnonymous
    ? 'Guest Supervisor'
    : user?.email || profile?.fullName || 'Guest Supervisor';

  const getInitials = (name?: string | null) => {
    if (!name) return 'GS';
    return name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar md:flex md:flex-col">
        <div className="flex h-full max-h-screen flex-col gap-2 text-sidebar-foreground">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="">MineMatey</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-white hover:bg-sidebar-accent"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <Separator className="my-4 bg-sidebar-border" />
              <Link
                href="/dashboard/upgrade"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary font-bold transition-all hover:bg-sidebar-accent"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4 flex items-center gap-3 border-t border-sidebar-border">
            <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-gray-700 text-white text-xs font-bold uppercase">
              {getInitials(profile?.fullName || displayIdentity)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{profile?.fullName || displayIdentity}</p>
              <p className="text-[11px] text-sidebar-foreground/70 truncate">{displayIdentity}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-sidebar text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <span className="">MineMatey</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/dashboard/upgrade"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-primary font-bold hover:bg-sidebar-accent"
                >
                  <Sparkles className="h-5 w-5" />
                  Upgrade to Pro
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Global Header Active Mine Site Selector */}
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-primary shrink-0 hidden sm:inline-block" />
              <label
                htmlFor="global-header-mine-select"
                className="text-xs font-medium text-muted-foreground hidden sm:inline-block"
              >
                Active Mine Site:
              </label>
              <select
                id="global-header-mine-select"
                value={selectedMineId}
                onChange={(e) => setSelectedMineId(e.target.value)}
                aria-label="Global Active MSHA Mine Site"
                className="flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {mineOptions.map((mine) => (
                  <option key={mine.id} value={mine.id}>
                    {mine.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin Link, Logged-in User Display & Sign Out Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {canAccessAdmin && (
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  <Link href="/admin">
                    <Settings className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Admin Settings
                  </Link>
                </Button>
              )}

              <div className="hidden sm:flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium">
                <UserIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[180px]" title={displayIdentity}>
                  {displayIdentity}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2.5 text-xs"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ''} alt={displayIdentity} />
                  <AvatarFallback>{getInitials(profile?.fullName || displayIdentity)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.fullName || displayIdentity}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {displayIdentity}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/upgrade" className="flex items-center w-full">
                  <CreditCard className="mr-2 h-4 w-4" /> Subscription
                </Link>
              </DropdownMenuItem>
              {canAccessAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" /> Admin Settings
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
