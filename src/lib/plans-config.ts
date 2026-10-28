
export type PlanKey = 'starter' | 'pro' | 'enterprise';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  key: PlanKey;
  name: string;
  price: string;
  priceId: string; // From Stripe
  description: string;
  features: PlanFeature[];
  buttonText: string;
  isPopular?: boolean;
  limits: {
    usersMax: number | 'unlimited';
    minesMax: number | 'unlimited';
  };
}

export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$0',
    priceId: '', // Free plan usually doesn't need a checkout session
    description: 'Perfect for small individual operations.',
    buttonText: 'Current Plan',
    limits: {
      usersMax: 1,
      minesMax: 1,
    },
    features: [
      { text: '1 User Account', included: true },
      { text: '1 Mine Site', included: true },
      { text: 'Standard Safety Exams', included: true },
      { text: 'Document Storage (Limit 50MB)', included: true },
      { text: 'AI Safety Advisor', included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    priceId: 'price_placeholder_pro_monthly', // REPLACE WITH STRIPE PRICE ID
    description: 'Best for growing teams and multiple sites.',
    buttonText: 'Upgrade to Pro',
    isPopular: true,
    limits: {
      usersMax: 10,
      minesMax: 3,
    },
    features: [
      { text: 'Up to 10 User Accounts', included: true },
      { text: 'Up to 3 Mine Sites', included: true },
      { text: 'Advanced Safety Exams', included: true },
      { text: 'Document Storage (Limit 5GB)', included: true },
      { text: 'AI Safety Advisor (Unlimited)', included: true },
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceId: 'price_placeholder_enterprise', // REPLACE WITH STRIPE PRICE ID
    description: 'For large scale mining corporations.',
    buttonText: 'Contact Sales',
    limits: {
      usersMax: 'unlimited',
      minesMax: 'unlimited',
    },
    features: [
      { text: 'Unlimited User Accounts', included: true },
      { text: 'Unlimited Mine Sites', included: true },
      { text: 'Custom Reporting', included: true },
      { text: 'Priority AI Support', included: true },
      { text: 'Dedicated Account Manager', included: true },
    ],
  },
];
