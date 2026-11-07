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

// ... truncated for test, full content to be applied
