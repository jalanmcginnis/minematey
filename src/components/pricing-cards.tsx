
'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { PLANS, Plan } from '@/lib/plans-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { collection, addDoc, onSnapshot, doc, DocumentReference } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function PricingCards() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: Plan) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please log in to upgrade.' });
      return;
    }

    if (plan.key === 'starter') return; // Already on free

    if (plan.key === 'enterprise') {
        window.location.href = 'mailto:sales@minematey.com?subject=Enterprise Plan Inquiry';
        return;
    }

    setLoadingPlan(plan.key);

    try {
      const checkoutSessionsRef = collection(firestore, 'users', user.uid, 'checkout_sessions');
      
      // 1. Create a checkout session document in Firestore
      // The "Run Payments with Stripe" extension will see this and update it with a Stripe URL
      const docRef = await addDoc(checkoutSessionsRef, {
        price: plan.priceId,
        success_url: window.location.origin + '/dashboard?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: window.location.origin + '/dashboard/upgrade',
        mode: 'subscription', // or 'payment' for one-time
      });

      // 2. Wait for the extension to write the URL back to the document
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        if (data?.url) {
          unsubscribe();
          window.location.assign(data.url);
        } else if (data?.error) {
          unsubscribe();
          setLoadingPlan(null);
          console.error('Stripe error:', data.error);
          toast({ variant: 'destructive', title: 'Stripe Error', description: data.error.message });
        }
      });

    } catch (err: any) {
      console.error('Checkout session creation failed:', err);
      setLoadingPlan(null);
      toast({ variant: 'destructive', title: 'Setup Failed', description: err.message });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => (
        <Card key={plan.key} className={cn("flex flex-col relative overflow-hidden", plan.isPopular && "border-primary shadow-lg scale-105 z-10")}>
          {plan.isPopular && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> MOST POPULAR
            </div>
          )}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.key !== 'enterprise' && <span className="text-muted-foreground ml-1">/month</span>}
            </div>
            <ul className="space-y-3 text-sm">
              {plan.features.map((feature, i) => (
                <li key={i} className={cn("flex items-start gap-2", !feature.included && "text-muted-foreground opacity-50")}>
                  <Check className={cn("h-4 w-4 shrink-0 mt-0.5", feature.included ? "text-primary" : "text-muted-foreground")} />
                  <span className={!feature.included ? "line-through" : ""}>{feature.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant={plan.isPopular ? "default" : "outline"}
              disabled={loadingPlan !== null || plan.key === 'starter'}
              onClick={() => handleUpgrade(plan)}
            >
              {loadingPlan === plan.key ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : plan.buttonText}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
