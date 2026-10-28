'use client';

import Link from "next/link";
import {
  ArrowUpRight,
  BookUser,
  CalendarDays,
  FileText,
  Mountain,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { AIRecommendationForm } from "@/components/ai-recommendation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActiveMine } from "@/context/MineContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const {
    selectedMineId,
    selectedMineName,
    selectedMineLabel,
    setSelectedMineId,
    mineOptions,
  } = useActiveMine();
  const { user, profile, loading } = useAuth();

  const canAccessAdmin =
    loading ||
    profile?.role === "admin" ||
    profile?.role?.toLowerCase() === "admin" ||
    user?.email === "jalanmcginnis@gmail.com" ||
    user?.email?.toLowerCase() === "jalanmcginnis@gmail.com" ||
    profile?.fullName === "Guest Supervisor" ||
    Boolean(user?.isAnonymous);

  const quickLinks = [
    {
      title: "Workplace Exams",
      description: "Complete and review workplace safety examinations.",
      href: "/dashboard/workplace-exams",
      icon: ShieldCheck,
      isPrimary: true,
      buttonVariant: "default" as const,
    },
    {
      title: "Equipment Exams",
      description: "Log and track heavy machinery and equipment inspections.",
      href: "/dashboard/equipment-exams",
      icon: Wrench,
      isPrimary: true,
      buttonVariant: "default" as const,
    },
    {
      title: "Required Documents",
      description: "View and manage all required compliance documents.",
      href: "/dashboard/required-documents",
      icon: FileText,
      isPrimary: true,
      buttonVariant: "default" as const,
    },
    {
      title: "Training Documents",
      description: "Upload and retrieve MSHA training records by type.",
      href: "/dashboard/training-documents",
      icon: BookUser,
      isPrimary: true,
      buttonVariant: "default" as const,
    },
    {
      title: "Scheduling",
      description: "Plan and view upcoming exams, training, and deadlines.",
      href: "/dashboard/scheduling",
      icon: CalendarDays,
      isPrimary: true,
      buttonVariant: "default" as const,
    },
    ...(canAccessAdmin
      ? [
          {
            title: "Admin Settings",
            description: "Manage company MSHA mine sites and user roles.",
            href: "/admin",
            icon: Settings,
            isPrimary: true,
            buttonVariant: "default" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Master Active Mine Site Selector Card */}
      <Card className="border-primary/40 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mountain className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Active Mine Site</CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">
                  {selectedMineName} • MSHA ID: {selectedMineId}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Currently managing records for <strong>{selectedMineLabel}</strong>. Selecting a mine here applies across Workplace Exams, Equipment Exams, Documents, and Scheduling.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-72 shrink-0">
            <Label htmlFor="dashboard-mine-site-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select MSHA Mine Site
            </Label>
            <select
              id="dashboard-mine-site-select"
              value={selectedMineId}
              onChange={(e) => setSelectedMineId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {mineOptions.map((mine) => (
                <option key={mine.id} value={mine.id}>
                  {mine.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Card key={link.title} className={cn("flex flex-col justify-between", link.isPrimary && "bg-secondary")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={cn(
                  "text-sm font-bold",
                  link.isPrimary && "text-secondary-foreground"
                )}
              >
                {link.title}
              </CardTitle>
              <link.icon
                className={cn(
                  "h-4 w-4 text-muted-foreground",
                  link.isPrimary && "text-secondary-foreground/70"
                )}
              />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between">
              <p
                className={cn(
                  "text-xs text-muted-foreground",
                  link.isPrimary && "text-secondary-foreground/80"
                )}
              >
                {link.description}
              </p>
              <Button
                asChild
                size="sm"
                variant={link.buttonVariant || (link.isPrimary ? "secondary" : "outline")}
                className="mt-4 w-full"
              >
                <Link href={link.href}>
                  Go to {link.title}
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AIRecommendationForm />
    </div>
  );
}
