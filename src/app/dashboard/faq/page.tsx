'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const sections = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is MineMatey?',
        a: 'MineMatey is a multi-tenant safety and compliance app for surface mining operations. It helps you record workplace exams, equipment exams, required documents, training records, and schedules for each mine site.',
      },
      {
        q: 'How do accounts and companies work?',
        a: 'Each user belongs to one company. Your company determines which mines, exams, documents, and schedules you can see. Admins manage mines and users for that company. Signing in with a different company only shows that company’s data.',
      },
      {
        q: 'How do I switch mines?',
        a: 'Use the mine selector in the dashboard. The active mine filters workplace exams, equipment exams, documents, and schedules. If your company has no mines set up yet, the app falls back to sample mines until an admin adds real mine records.',
      },
    ],
  },
  {
    title: 'Workplace exams',
    items: [
      {
        q: 'What are workplace exams used for?',
        a: 'Workplace exams record the condition of work areas, findings, and corrective actions. They support the documentation expected under 30 CFR workplace examination requirements.',
      },
      {
        q: 'Can I export workplace exams?',
        a: 'Yes. The workplace exams list includes a CSV export of the exams currently loaded for the active mine.',
      },
      {
        q: 'What happens if a defect is found?',
        a: 'Any defect found during a workplace exam needs to be corrected. Record the finding and the corrective action on the exam so the condition and the response are both documented.',
      },
      {
        q: 'How am I reminded about uncorrected defects?',
        a: 'The dashboard shows a weekly reminder for uncorrected workplace and equipment exam defects on the active mine. Open defects stay listed until they are marked corrected. You can also email the current open-defect list from that reminder.',
      },
    ],
  },
  {
    title: 'Equipment exams',
    items: [
      {
        q: 'What are equipment exams used for?',
        a: 'Equipment exams record inspections, defects, and corrective actions for mobile and stationary equipment. They support the documentation expected under 30 CFR equipment examination requirements.',
      },
      {
        q: 'Can I export equipment exams?',
        a: 'Yes. The equipment exams list includes a CSV export of the exams currently loaded for the active mine.',
      },
    ],
  },
  {
    title: 'Photos and retention',
    items: [
      {
        q: 'Where can I attach photos?',
        a: 'Photos and PDFs can be attached on workplace exam and equipment exam records. Files are stored securely and are only available to users in the same company.',
      },
      {
        q: 'How long are exam photos kept?',
        a: 'Exam photos and attachments for workplace exams and equipment exams are retained for 24 months. This gives a practical window beyond the typical regulatory retention period so you can export or archive records before they age out. Required documents and training records are not covered by this photo retention policy.',
      },
      {
        q: 'Are other records deleted on the same schedule?',
        a: 'No. Required documents, training documents, and other mandatory compliance records are preserved. Only photo and attachment files tied to workplace and equipment exams follow the 24-month retention window.',
      },
    ],
  },
  {
    title: 'Viewing and sharing documents',
    items: [
      {
        q: 'How do I view a document or photo?',
        a: 'Open the relevant list (workplace exams, equipment exams, required documents, or training documents), select the record, and use the attachment or file link. Files open from secure company-scoped storage and are available only to signed-in users in the same company.',
      },
      {
        q: 'How are documents shared?',
        a: 'Documents are shared by company membership, not by public link. Anyone in your company with an allowed role (admin, supervisor, examiner, or user) can view the company’s exams, photos, required documents, and training records for the mines they can access. People outside the company cannot see them.',
      },
      {
        q: 'Can I download records?',
        a: 'Yes. Workplace and equipment exam lists support CSV export of the loaded records. Individual files can be opened or downloaded from their attachment links.',
      },
    ],
  },
  {
    title: 'Required documents',
    items: [
      {
        q: 'What belongs in Required Documents?',
        a: 'Use Required Documents for compliance files that must be kept on hand, such as plans, permits, and other mandatory records. These files are stored by mine and company and are not subject to the exam photo retention policy.',
      },
    ],
  },
  {
    title: 'Training documents',
    items: [
      {
        q: 'What belongs in Training Documents?',
        a: 'Use Training Documents for training records, certifications, and related files. These are kept by mine and company and are preserved independently of the exam photo retention policy.',
      },
    ],
  },
  {
    title: 'Scheduling',
    items: [
      {
        q: 'What is Scheduling for?',
        a: 'Scheduling lets you track upcoming and completed tasks for the active mine, such as inspections or follow-ups. Items are scoped to your company and the selected mine.',
      },
    ],
  },
  {
    title: 'Plans and limits',
    items: [
      {
        q: 'What plans are available?',
        a: 'Starter ($29/mo): 1 user, 1 mine, 10 AI calls, with a 30-day exams-only trial. Basic ($50/mo): 5 users, 3 mines, 30 AI calls. Team ($89/mo): 20 users, 8 mines, unlimited AI. Business ($299/mo): 75 users, 35 mines, unlimited AI. Enterprise: custom limits and support.',
      },
      {
        q: 'What is limited on lower plans?',
        a: 'Lower tiers limit the number of users, mines, and AI Safety Advisor calls. The Starter trial is limited to workplace and equipment exams. Higher tiers unlock full features and higher or unlimited AI usage.',
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        q: 'Who can use Admin Settings?',
        a: 'Users with the admin role can open Admin Settings to manage mine sites and users for their company. Other roles work within the mines assigned to the company but do not manage company-wide settings.',
      },
      {
        q: 'How do I add a mine?',
        a: 'An admin adds a mine record for the company. Once the mine exists and is active, it appears in the mine selector for everyone in that company.',
      },
    ],
  },
  {
    title: 'AI Safety Advisor',
    items: [
      {
        q: 'What does the AI Safety Advisor do?',
        a: 'The AI Safety Advisor can help draft recommendations related to workplace exam findings. Usage is counted against your plan’s monthly AI call limit.',
      },
      {
        q: 'Why might AI be unavailable?',
        a: 'AI access depends on your plan. Trial and lower tiers have a monthly cap or may not include AI. Once the monthly limit is reached, additional calls are blocked until the next period or until you upgrade.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FAQ</h1>
        <p className="text-muted-foreground">
          Brief answers about exams, documents, retention, plans, and administration.
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>
                {section.items.length} {section.items.length === 1 ? 'topic' : 'topics'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, index) => (
                  <AccordionItem key={item.q} value={`${section.title}-${index}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
