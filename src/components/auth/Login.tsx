'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { AlertCircle, Loader2, ShieldCheck, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/context/AuthContext';

export function Login() {
  const loginBg = PlaceHolderImages.find((img) => img.id === 'login-background');
  const { user, loading, auth } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningInEmail, setIsSigningInEmail] = useState(false);
  const [isSigningInGuest, setIsSigningInGuest] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const formatAuthErrorMessage = (error: any): string => {
    const code = error?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return 'Invalid email or password. Please check your credentials and try again. (auth/invalid-credential)';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed login attempts. Please wait a moment and try again.';
    }
    return error?.message || 'Unable to sign in. Please verify your credentials.';
  };

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password) {
      setAuthError('Please enter both your email address and password.');
      return;
    }

    setIsSigningInEmail(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error during email/password sign-in:', error);
      setAuthError(formatAuthErrorMessage(error));
    } finally {
      setIsSigningInEmail(false);
    }
  };

  const handleGuestSignIn = async () => {
    setAuthError(null);
    setIsSigningInGuest(true);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error during anonymous guest sign-in:', error);
      setAuthError(
        error?.message || 'Unable to start guest session. Please try again.'
      );
    } finally {
      setIsSigningInGuest(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 bg-background">
        <div className="mx-auto grid w-full max-w-[400px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold font-headline text-secondary">
              Mine Matey
            </h1>
            <p className="text-balance text-sm text-textSecondary">
              Simplify &amp; Digitalize MSHA Safety Compliance
            </p>
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Supervisor &amp; Admin Portal
              </CardTitle>
              <CardDescription className="text-xs">
                Sign in with your assigned Mine Matey credentials or launch the preview environment.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-5">
              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleEmailSignIn} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="supervisor@minematey.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSigningInEmail || isSigningInGuest}
                >
                  {isSigningInEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In as Admin / Supervisor'
                  )}
                </Button>
              </form>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or Bypass Login
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGuestSignIn}
                disabled={isSigningInEmail || isSigningInGuest}
              >
                {isSigningInGuest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Guest Session...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Continue as Guest / Dev Preview
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden bg-muted lg:block relative">
        {loginBg && (
          <Image
            src={loginBg.imageUrl}
            alt={loginBg.description}
            data-ai-hint={loginBg.imageHint}
            fill
            className="object-cover"
            priority
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-primary/60" />
      </div>
    </div>
  );
}
export default Login;
