
import { PricingCards } from "@/components/pricing-cards";
import { ShieldCheck } from "lucide-react";

export default function UpgradePage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
          <ShieldCheck className="h-3.5 w-3.5" /> PRO COMPLIANCE
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Scale your safety operations with advanced compliance tools, unlimited site management, and our specialized AI Safety Advisor.
        </p>
      </div>

      <PricingCards />

      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-card-foreground">Why upgrade to Pro?</h2>
        <div className="grid md:grid-cols-3 gap-8 pt-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Collaborative Teams</h3>
            <p className="text-sm text-muted-foreground text-balance">Bring your entire team onboard with up to 10 user accounts and delegated safety responsibilities.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">AI Safety Advisor</h3>
            <p className="text-sm text-muted-foreground text-balance">Get unlimited access to our AI that analyzes worksite conditions and provides MSHA-tailored recommendations.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Enhanced Compliance</h3>
            <p className="text-sm text-muted-foreground text-balance">Unlock advanced reporting, unlimited training record uploads, and site-wide safety tracking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
