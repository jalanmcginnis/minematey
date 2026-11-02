
export type PlanKey = 'starter' | 'basic' | 'team' | 'business' | 'enterprise';

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
    aiCallsMax?: number | 'unlimited';
  };
}

export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$0',
    priceId: '',
    description: 'Core workplace and equipment exams for sole operators.',
    buttonText: 'Current Plan',
    limits: {
      usersMax: 1,
      minesMax: 1,
      aiCallsMax: 0,
    },
    features: [
      { text: '1 User Account', included: true },
      { text: '1 Mine Site', included: true },
      { text: 'Workplace Exams', included: true },
      { text: 'Equipment Exams', included: true },
      { text: 'Photos', included: false },
      { text: 'Email / Upload Features', included: false },
      { text: 'AI Safety Advisor', included: false },
    ],
  },
  {
    key: 'basic',
    name: 'Basic',
    price: '$50',
    priceId: 'price_placeholder_basic_monthly', // REPLACE WITH STRIPE PRICE ID
    description: 'All features with light AI for small teams.',
    buttonText: 'Upgrade to Basic',
    limits: {
      usersMax: 5,
      minesMax: 2,
      aiCallsMax: 50,
    },
    features: [
      { text: 'Up to 5 User Accounts', included: true },
      { text: '1–2 Mine Sites', included: true },
      { text: 'All Exam Features', included: true },
      { text: 'Photos (No Storage Cap)', included: true },
      { text: 'Email / Upload Features', included: true },
      { text: 'AI Safety Advisor (50 calls/month)', included: true },
    ],
  },
  {
    key: 'team',
    name: 'Team',
    price: '$89',
    priceId: 'price_placeholder_team_monthly', // REPLACE WITH STRIPE PRICE ID
    description: 'Growing contractors with full AI and multi-site support.',
    buttonText: 'Upgrade to Team',
    isPopular: true,
    limits: {
      usersMax: 20,
      minesMax: 8,
      aiCallsMax: 'unlimited',
    },
    features: [
      { text: 'Up to 20 User Accounts', included: true },
      { text: 'Up to 8 Mine Sites', included: true },
      { text: 'All Features', included: true },
      { text: 'Photos (No Storage Cap)', included: true },
      { text: 'Email / Upload Features', included: true },
      { text: 'AI Safety Advisor (Unlimited)', included: true },
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: '$299',
    priceId: 'price_placeholder_business_monthly', // REPLACE WITH STRIPE PRICE ID
    description: 'Multi-site operators with advanced roles and reporting.',
    buttonText: 'Upgrade to Business',
    limits: {
      usersMax: 75,
      minesMax: 35,
      aiCallsMax: 'unlimited',
    },
    features: [
      { text: 'Up to 75 User Accounts', included: true },
      { text: 'Up to 35 Mine Sites', included: true },
      { text: 'All Features', included: true },
      { text: 'Advanced Reporting & Roles', included: true },
      { text: 'Photos (No Storage Cap)', included: true },
      { text: 'AI Safety Advisor (Unlimited)', included: true },
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceId: 'price_placeholder_enterprise', // REPLACE WITH STRIPE PRICE ID
    description: 'Large-scale operations with dedicated support and SLAs.',
    buttonText: 'Contact Sales',
    limits: {
      usersMax: 'unlimited',
      minesMax: 'unlimited',
      aiCallsMax: 'unlimited',
    },
    features: [
      { text: 'Unlimited User Accounts', included: true },
      { text: 'Unlimited Mine Sites', included: true },
      { text: 'Custom Reporting & Workflows', included: true },
      { text: 'Priority Support & SLAs', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: 'AI Safety Advisor (Unlimited)', included: true },
    ],
  },
];
