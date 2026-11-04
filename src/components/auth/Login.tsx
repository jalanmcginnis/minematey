'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AlertCircle, Loader2, Mail } from 'lucide-react';

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

type LoginProps = {
  headingFontClassName?: string;
  bodyFontClassName?: string;
};

export function Login({
  headingFontClassName = '',
  bodyFontClassName = '',
}: LoginProps) {
  const loginBg = PlaceHolderImages.find((img) => img.id === 'login-background');
  const { user, loading, auth } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningInEmail, setIsSigningInEmail] = useState(false);

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

  if (loading || user) {
    return (
      <div
        className={`flex h-screen w-full items-center justify-center bg-[#F8F9FA] ${bodyFontClassName}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#F28C28]" />
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen lg:grid lg:min-h-screen lg:grid-cols-2 ${bodyFontClassName}`}>
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-8 text-[#343A40] sm:px-6 lg:py-12">
        <div className="mx-auto grid w-full max-w-[400px] gap-6">
          <div className="grid justify-items-center gap-2 text-center">
            <Image
              src="/minematey-logo.png"
              alt="MineMatey logo"
              width={176}
              height={191}
              priority
              className="h-auto w-36 sm:w-44"
            />
            <p className="text-balance text-sm text-[#6C757D]">
              Simplify &amp; Digitalize MSHA Safety Compliance
            </p>
          </div>

          <Card className="border border-[#6C757D]/25 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className={`text-xl text-[#343A40] ${headingFontClassName}`}>
                Login to MineMatey
              </CardTitle>
              <CardDescription className="text-xs text-[#6C757D]">
                Sign in with your assigned MineMatey credentials or launch the preview environment.
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
                  <Label htmlFor="email" className="text-[#343A40]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="supervisor@minematey.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="bg-white focus-visible:ring-[#F28C28]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-[#343A40]">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="bg-white focus-visible:ring-[#F28C28]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#F28C28] text-white hover:bg-[#F28C28]/90"
                  disabled={isSigningInEmail}
                >
                  {isSigningInEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-[#6C757D]">
                    Need help?
                  </span>
                </div>
              </div>

              <Button
                asChild
                type="button"
                variant="secondary"
                className="w-full border border-[#6C757D]/40 bg-white text-[#343A40] hover:bg-[#F8F9FA]"
              >
                <a href="mailto:minematey@proton.me?subject=MineMatey%20information%20request">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact MineMatey
                </a>
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
