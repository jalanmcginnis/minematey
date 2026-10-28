'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseApp } from '@/firebase';

export interface UserProfileData {
  companyId: string;
  role: string;
  fullName: string;
  assignedMines: string[];
  email?: string;
}

export interface CompanyPlanData {
  planTier: string;
  maxMines: number;
  maxUsers: number;
  subscriptionStatus: string;
}

export const DEFAULT_COMPANY_PLAN: CompanyPlanData = {
  planTier: 'small_operator',
  maxMines: 3,
  maxUsers: 5,
  subscriptionStatus: 'active',
};

export interface AuthContextValue {
  user: User | null;
  profile: UserProfileData | null;
  companyPlan: CompanyPlanData;
  loading: boolean;
  auth: Auth;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const MASTER_ADMIN_EMAIL = 'jalanmcginnis@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [companyPlan, setCompanyPlan] = useState<CompanyPlanData>(DEFAULT_COMPANY_PLAN);
  const [loading, setLoading] = useState<boolean>(true);

  const authInstance = getAuth(firebaseApp);

  // Helper to fetch doc(db, "companies", companyId) with safe fallback
  const loadCompanyPlan = async (companyId: string) => {
    if (!companyId) {
      setCompanyPlan(DEFAULT_COMPANY_PLAN);
      return;
    }

    try {
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        const data = companySnap.data();
        setCompanyPlan({
          planTier: data.planTier || DEFAULT_COMPANY_PLAN.planTier,
          maxMines:
            typeof data.maxMines === 'number'
              ? data.maxMines
              : DEFAULT_COMPANY_PLAN.maxMines,
          maxUsers:
            typeof data.maxUsers === 'number'
              ? data.maxUsers
              : DEFAULT_COMPANY_PLAN.maxUsers,
          subscriptionStatus:
            data.subscriptionStatus || DEFAULT_COMPANY_PLAN.subscriptionStatus,
        });
      } else {
        setCompanyPlan(DEFAULT_COMPANY_PLAN);
      }
    } catch (error) {
      console.error('Error fetching company plan from companies collection:', error);
      setCompanyPlan(DEFAULT_COMPANY_PLAN);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      authInstance,
      async (firebaseUser) => {
        // Keep loading true until auth and profile resolution completes
        setLoading(true);

        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          setCompanyPlan(DEFAULT_COMPANY_PLAN);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);

        if (firebaseUser.isAnonymous) {
          const guestProfile: UserProfileData = {
            companyId: 'comp_test_001',
            role: 'admin',
            fullName: 'Guest Supervisor',
            assignedMines: ['13-00123', '13-00456'],
          };
          setProfile(guestProfile);
          await loadCompanyPlan(guestProfile.companyId);
          setLoading(false);
          return;
        }

        const isMasterAdmin =
          firebaseUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL;

        // Immediately seed optimistic profile if master admin so UI never flickers
        if (isMasterAdmin) {
          setProfile({
            email: firebaseUser.email || MASTER_ADMIN_EMAIL,
            companyId: 'comp_test_001',
            role: 'admin',
            fullName: firebaseUser.displayName || 'Jed McGinnis',
            assignedMines: ['13-00123', '13-00456'],
          });
        }

        // Authenticated via Email/Password
        let resolvedCompanyId = 'comp_test_001';
        try {
          const profileRef = doc(db, 'user_profiles', firebaseUser.uid);
          const snap = await getDoc(profileRef);
          const userDoc = snap.data();

          console.log('Fetched Auth Profile Data:', userDoc);

          const userRole = isMasterAdmin
            ? 'admin'
            : userDoc?.role ||
              (firebaseUser.email === MASTER_ADMIN_EMAIL ? 'admin' : 'examiner');

          if (snap.exists() && userDoc) {
            resolvedCompanyId = userDoc.companyId || 'comp_test_001';
            const resolvedProfile: UserProfileData = {
              companyId: resolvedCompanyId,
              role: userRole,
              fullName:
                userDoc.fullName ||
                userDoc.name ||
                firebaseUser.displayName ||
                'Jed McGinnis',
              assignedMines:
                Array.isArray(userDoc.assignedMines) &&
                userDoc.assignedMines.length > 0
                  ? userDoc.assignedMines
                  : ['13-00123', '13-00456'],
              email: userDoc.email || firebaseUser.email || undefined,
            };

            // Self-heal if master admin document existed with a non-admin role
            if (isMasterAdmin && userDoc.role !== 'admin') {
              try {
                await setDoc(
                  profileRef,
                  {
                    email: firebaseUser.email,
                    companyId: resolvedProfile.companyId,
                    role: 'admin',
                    fullName: resolvedProfile.fullName,
                    assignedMines: resolvedProfile.assignedMines,
                  },
                  { merge: true }
                );
              } catch (healErr) {
                console.error(
                  'Error self-healing master admin role in user_profiles:',
                  healErr
                );
              }
            }

            setProfile(resolvedProfile);
          } else {
            // Profile Self-Healing when doc(db, "user_profiles", user.uid) does not exist
            if (isMasterAdmin) {
              const masterProfile: UserProfileData = {
                email: firebaseUser.email || MASTER_ADMIN_EMAIL,
                companyId: 'comp_test_001',
                role: 'admin',
                fullName: 'Jed McGinnis',
                assignedMines: ['13-00123', '13-00456'],
              };

              try {
                await setDoc(doc(db, 'user_profiles', firebaseUser.uid), {
                  email: firebaseUser.email,
                  companyId: 'comp_test_001',
                  role: 'admin',
                  fullName: 'Jed McGinnis',
                  assignedMines: ['13-00123', '13-00456'],
                });
              } catch (writeError) {
                console.error(
                  'Error self-healing master admin user_profiles document:',
                  writeError
                );
              }

              setProfile(masterProfile);
            } else {
              const baselineProfile: UserProfileData = {
                email: firebaseUser.email || '',
                companyId: 'comp_test_001',
                role: userRole,
                fullName: firebaseUser.displayName || 'Jed McGinnis',
                assignedMines: ['13-00123'],
              };

              try {
                await setDoc(profileRef, {
                  ...baselineProfile,
                  uid: firebaseUser.uid,
                  createdAt: new Date().toISOString(),
                });
              } catch (writeError) {
                console.error(
                  'Error creating baseline user_profiles document:',
                  writeError
                );
              }

              setProfile(baselineProfile);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile from user_profiles:', error);
          const fallbackRole =
            firebaseUser.email === MASTER_ADMIN_EMAIL || isMasterAdmin
              ? 'admin'
              : 'examiner';
          setProfile({
            companyId: 'comp_test_001',
            role: fallbackRole,
            fullName: firebaseUser.displayName || 'Jed McGinnis',
            assignedMines: ['13-00123', '13-00456'],
            email: firebaseUser.email || undefined,
          });
        }

        // Fetch company plan for the resolved companyId
        await loadCompanyPlan(resolvedCompanyId);
        setLoading(false);
      },
      (error) => {
        console.error('AuthContext onAuthStateChanged error:', error);
        setUser(null);
        setProfile(null);
        setCompanyPlan(DEFAULT_COMPANY_PLAN);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authInstance]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(authInstance, email, password);
    } catch (error) {
      console.error('Error signing in with email and password:', error);
      throw error;
    }
  };

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(authInstance);
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(authInstance);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        companyPlan,
        loading,
        auth: authInstance,
        signInWithEmail,
        signInAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
