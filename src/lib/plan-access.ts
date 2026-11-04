export type PlanAccess = {
  planTier: string;
  maxMines: number;
  maxUsers: number;
  aiCallsMax: number | 'unlimited';
  examsOnly: boolean;
  label: string;
};

const PLAN_ACCESS: Record<string, PlanAccess> = {
  starter: {
    planTier: 'starter',
    label: 'Starter',
    maxMines: 1,
    maxUsers: 1,
    aiCallsMax: 10,
    examsOnly: false,
  },
  basic: {
    planTier: 'basic',
    label: 'Basic',
    maxMines: 3,
    maxUsers: 5,
    aiCallsMax: 30,
    examsOnly: false,
  },
  small_operator: {
    planTier: 'basic',
    label: 'Basic',
    maxMines: 3,
    maxUsers: 5,
    aiCallsMax: 30,
    examsOnly: false,
  },
  team: {
    planTier: 'team',
    label: 'Team',
    maxMines: 8,
    maxUsers: 20,
    aiCallsMax: 'unlimited',
    examsOnly: false,
  },
  business: {
    planTier: 'business',
    label: 'Business',
    maxMines: 35,
    maxUsers: 75,
    aiCallsMax: 'unlimited',
    examsOnly: false,
  },
  enterprise: {
    planTier: 'enterprise',
    label: 'Enterprise',
    maxMines: 9999,
    maxUsers: 9999,
    aiCallsMax: 'unlimited',
    examsOnly: false,
  },
};

export function resolvePlanAccess(input: {
  planTier?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  maxMines?: number;
  maxUsers?: number;
}): PlanAccess {
  const key = String(input.planTier || 'starter').toLowerCase();
  const base = PLAN_ACCESS[key] || PLAN_ACCESS.starter;
  const trialEndsAt = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
  const trialActive =
    String(input.subscriptionStatus || '').toLowerCase() === 'trial' ||
    String(input.subscriptionStatus || '').toLowerCase() === 'trialing' ||
    (trialEndsAt !== null && !Number.isNaN(trialEndsAt.getTime()) && trialEndsAt.getTime() > Date.now());

  return {
    ...base,
    maxMines: typeof input.maxMines === 'number' ? input.maxMines : base.maxMines,
    maxUsers: typeof input.maxUsers === 'number' ? input.maxUsers : base.maxUsers,
    examsOnly: trialActive || base.examsOnly,
    label: trialActive ? `${base.label} trial` : base.label,
  };
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isAiLimitReached(
  aiCallsMax: number | 'unlimited',
  used: number,
): boolean {
  if (aiCallsMax === 'unlimited') return false;
  return used >= aiCallsMax;
}
