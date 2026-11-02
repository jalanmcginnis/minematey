
import { PricingCards } from "@/components/pricing-cards";
import { ShieldCheck } from "lucide-react";

export default function UpgradePage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
          <ShieldCheck className="h-3.5 w-3.5" /> PRO COMPLIANCE
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          From sole operators to large mining corporations — scale exams, teams, and AI-powered safety with the right plan.
        </p>
      </div>

      <PricingCards />

      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-card-foreground">Why upgrade?</h2>
        <div className="grid md:grid-cols-3 gap-8 pt-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Right-sized Teams</h3>
            <p className="text-sm text-muted-foreground text-balance">Start free with core exams, then add users and sites as you grow — up to unlimited on Enterprise.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">AI Safety Advisor</h3>
            <p className="text-sm text-muted-foreground text-balance">Light usage on Basic (50 calls/month) and unlimited on Team and above for MSHA-tailored recommendations.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Full Feature Access</h3>
            <p className="text-sm text-muted-foreground text-balance">Photos, uploads, email, and advanced tools unlock at Basic and expand with higher tiers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
