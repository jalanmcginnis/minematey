'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useActiveMine } from '@/context/MineContext';
import { useToast } from '@/hooks/use-toast';
import {
  workplaceRecommendation,
  type WorkplaceRecommendationInput,
} from '@/ai/flows/workplace-recommendation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Sparkles,
  ShieldAlert,
  ClipboardCheck,
  Scale,
} from 'lucide-react';

const formSchema = z.object({
  worksiteDetails: z
    .string()
    .min(10, 'Please provide more details about the worksite or defects.'),
  location: z.string().min(2, 'Please enter a valid mine site or location.'),
});

export function AIRecommendationForm() {
  const { selectedMineId, selectedMineName, selectedMineLabel } = useActiveMine();
  const { toast } = useToast();

  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingDefects, setIsAnalyzingDefects] = useState(false);
  const [activeDefectSummary, setActiveDefectSummary] = useState<{
    workplaceCount: number;
    equipmentCount: number;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      worksiteDetails: '',
      location: selectedMineLabel || 'North Pit (13-00123)',
    },
  });

  // Keep default location synced with global active mine selection
  useEffect(() => {
    if (selectedMineLabel) {
      form.setValue('location', selectedMineLabel);
    }
  }, [selectedMineLabel, form]);

  async function requestAdvisorAnalysis(payload: WorkplaceRecommendationInput) {
    try {
      const response = await fetch('/api/safety-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.safetyRecommendations) {
          return data.safetyRecommendations as string;
        }
      }
    } catch (apiError) {
      console.error('Error calling /api/safety-advisor endpoint:', apiError);
    }

    // Fallback to server action if fetch endpoint encountered an issue
    const fallbackResult = await workplaceRecommendation(payload);
    return fallbackResult.safetyRecommendations;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setRecommendation('');
    try {
      const safetyText = await requestAdvisorAnalysis({
        worksiteDetails: values.worksiteDetails,
        location: values.location,
        mineId: selectedMineId,
        mineName: selectedMineName,
      });
      setRecommendation(safetyText);
    } catch (error) {
      console.error('Error fetching AI safety recommendation:', error);
      setRecommendation('Failed to get recommendation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // 2. Context-Aware Inquiry: Pull recent uncorrected defects from workplace_exams and equipment_exams
  async function handleAnalyzeActiveMineDefects() {
    setIsAnalyzingDefects(true);
    setIsLoading(true);
    setRecommendation('');

    try {
      const workplaceDefects: string[] = [];
      const equipmentDefects: string[] = [];

      // Query collection("workplace_exams") for selectedMineId
      try {
        const wpQuery = query(
          collection(db, 'workplace_exams'),
          where('mshaMineId', '==', selectedMineId)
        );
        const wpSnap = await getDocs(wpQuery);
        const wpDocs = wpSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

        // Sort most recent first
        wpDocs.sort((a, b) => {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        wpDocs.forEach((exam) => {
          const rawStatus = String(exam.status || '').toLowerCase();
          const safetyStatus = String(
            exam.safetyStatus || exam.status || ''
          ).toLowerCase();
          const corrective = String(
            exam.correctiveActionNotes || exam.correctiveAction || ''
          ).trim();

          const isCorrected =
            rawStatus === 'corrected' ||
            Boolean(exam.correctedAt && corrective.length > 0);

          const isHazardStatus =
            rawStatus === 'open' ||
            rawStatus === 'under repair' ||
            safetyStatus === 'at_risk' ||
            safetyStatus === 'unsafe' ||
            safetyStatus.includes('defect');

          if (isHazardStatus && !isCorrected) {
            const examDateStr = exam.date
              ? new Date(exam.date).toLocaleDateString()
              : 'Recent';
            workplaceDefects.push(
              `[Workplace Exam - OPEN DEFECT] Area: "${
                exam.area || 'Unspecified Area'
              }" (${examDateStr}) — Findings: ${
                exam.findings || 'Hazard identified'
              } | Corrective Action: ${corrective || 'UNCORRECTED / PENDING'}`
            );
          }
        });
      } catch (wpError) {
        console.error('Error querying workplace_exams for active defects:', wpError);
      }

      // Query collection("equipment_exams") for selectedMineId
      try {
        const eqQuery = query(
          collection(db, 'equipment_exams'),
          where('mshaMineId', '==', selectedMineId)
        );
        const eqSnap = await getDocs(eqQuery);
        const eqDocs = eqSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

        // Sort most recent first
        eqDocs.sort((a, b) => {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        eqDocs.forEach((exam) => {
          const rawStatus = String(exam.status || '').toLowerCase();
          const safetyStatus = String(
            exam.safetyStatus || exam.status || ''
          ).toLowerCase();
          const defectText = String(
            exam.defectDetails || exam.defectsFound || ''
          ).trim();
          const corrective = String(
            exam.correctiveActionNotes || exam.correctiveAction || ''
          ).trim();

          const isCorrected =
            rawStatus === 'corrected' ||
            Boolean(exam.correctedAt && corrective.length > 0);

          const hasDefect =
            rawStatus === 'open' ||
            rawStatus === 'under repair' ||
            safetyStatus.includes('defect') ||
            safetyStatus.includes('red tag') ||
            safetyStatus === 'needs_repair' ||
            safetyStatus === 'out_of_service' ||
            safetyStatus === 'unsafe' ||
            (defectText.length > 0 && defectText.toLowerCase() !== 'none');

          if (hasDefect && !isCorrected) {
            const unitName =
              exam.equipmentUnit ||
              exam.equipmentId ||
              exam.equipmentNumber ||
              'Equipment Unit';
            const examDateStr = exam.date
              ? new Date(exam.date).toLocaleDateString()
              : 'Recent';
            equipmentDefects.push(
              `[Equipment Exam - OPEN DEFECT] Unit: "${unitName}" (${examDateStr}) — Defect: ${
                defectText || 'Mechanical safety defect'
              } | Corrective Action: ${corrective || 'UNCORRECTED / RED-TAGGED'}`
            );
          }
        });
      } catch (eqError) {
        console.error('Error querying equipment_exams for active defects:', eqError);
      }

      const recentWorkplaceDefects = workplaceDefects.slice(0, 8);
      const recentEquipmentDefects = equipmentDefects.slice(0, 8);

      setActiveDefectSummary({
        workplaceCount: recentWorkplaceDefects.length,
        equipmentCount: recentEquipmentDefects.length,
      });

      let compiledPromptDetails = '';
      if (
        recentWorkplaceDefects.length === 0 &&
        recentEquipmentDefects.length === 0
      ) {
        compiledPromptDetails = [
          `Active Mine Site: ${selectedMineLabel} (MSHA ID: ${selectedMineId})`,
          `No open uncorrected workplace or mobile equipment defects are currently flagged in the log.`,
          `Please provide a concise MSHA Part 56/57 shift supervisor verification checklist covering:`,
          `1. Pre-shift mobile equipment inspections (30 CFR § 56.14100)`,
          `2. Working place examinations and highwall/ground control (30 CFR § 56.18002)`,
          `3. Elevated work fall protection (30 CFR § 56.15005) and safe access ways (30 CFR § 56.11001).`,
        ].join('\n');

        toast({
          title: 'No Uncorrected Defects Found',
          description: `Generating preventive MSHA 30 CFR verification checklist for ${selectedMineLabel}.`,
        });
      } else {
        compiledPromptDetails = [
          `Active Mine Site: ${selectedMineLabel} (MSHA ID: ${selectedMineId})`,
          `Generate a prioritized MSHA Part 56/57 Hazard Remediation Checklist with 30 CFR citations for the following uncorrected site and equipment defects:`,
          ...(recentWorkplaceDefects.length > 0
            ? [
                `\nUNCORRECTED WORKPLACE EXAM DEFECTS (${recentWorkplaceDefects.length}):`,
                ...recentWorkplaceDefects,
              ]
            : []),
          ...(recentEquipmentDefects.length > 0
            ? [
                `\nUNCORRECTED EQUIPMENT EXAM DEFECTS (${recentEquipmentDefects.length}):`,
                ...recentEquipmentDefects,
              ]
            : []),
        ].join('\n');

        toast({
          title: 'Analyzing Active Mine Defects',
          description: `Loaded ${recentWorkplaceDefects.length} workplace and ${recentEquipmentDefects.length} equipment uncorrected defects for ${selectedMineLabel}.`,
        });
      }

      form.setValue('worksiteDetails', compiledPromptDetails, {
        shouldValidate: true,
      });
      form.setValue('location', selectedMineLabel, {
        shouldValidate: true,
      });

      const safetyText = await requestAdvisorAnalysis({
        worksiteDetails: compiledPromptDetails,
        location: selectedMineLabel,
        mineId: selectedMineId,
        mineName: selectedMineName,
      });

      setRecommendation(safetyText);
    } catch (error) {
      console.error('Error analyzing active mine defects:', error);
      setRecommendation(
        'Failed to analyze active mine defects. Please try again.'
      );
    } finally {
      setIsAnalyzingDefects(false);
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full border-primary/30">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle>AI Safety Advisor</CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] bg-primary/15 text-primary border-primary/30"
              >
                MSHA Part 56/57 Specialist • 30 CFR
              </Badge>
            </div>
            <CardDescription>
              Pragmatic, safety-first field guidance citing applicable 30 CFR standards (56.14100, 56.18002, 56.15005, 56.11001) for{' '}
              <strong>{selectedMineLabel}</strong>.
            </CardDescription>
          </div>

          {/* 2. Context-Aware Quick Action Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleAnalyzeActiveMineDefects}
            disabled={isLoading || isAnalyzingDefects}
            className="shrink-0 border border-primary/40 font-semibold"
          >
            {isAnalyzingDefects ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                Scanning Mine Defects...
              </>
            ) : (
              <>
                <ClipboardCheck className="mr-2 h-4 w-4 text-primary" />
                Analyze Active Mine Defects
              </>
            )}
          </Button>
        </div>

        {activeDefectSummary && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono text-xs">
              Active Mine: {selectedMineId}
            </Badge>
            <Badge
              variant={
                activeDefectSummary.workplaceCount > 0
                  ? 'destructive'
                  : 'secondary'
              }
              className="text-xs"
            >
              {activeDefectSummary.workplaceCount} Uncorrected Workplace{' '}
              {activeDefectSummary.workplaceCount === 1 ? 'Defect' : 'Defects'}
            </Badge>
            <Badge
              variant={
                activeDefectSummary.equipmentCount > 0
                  ? 'destructive'
                  : 'secondary'
              }
              className="text-xs"
            >
              {activeDefectSummary.equipmentCount} Uncorrected Equipment{' '}
              {activeDefectSummary.equipmentCount === 1 ? 'Defect' : 'Defects'}
            </Badge>
          </div>
        )}
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="worksiteDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Worksite Conditions / Hazard Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Describe a field hazard, equipment defect, or click 'Analyze Active Mine Defects' above to pull open defects from Workplace & Equipment Exams..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mine Site / Working Area Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., North Pit (13-00123) - Primary Crusher"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recommendation && (
              <div className="rounded-lg border border-primary/30 bg-secondary/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Scale className="h-4 w-4" />
                  MSHA Part 56/57 Remediation Checklist & 30 CFR Guidance
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {recommendation}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col items-start gap-4 border-t pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Under 30 CFR...
                </>
              ) : (
                <>Get MSHA Safety Recommendation</>
              )}
            </Button>

            {/* 3. Interface Safeguards Disclaimer */}
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground w-full">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                AI suggestions provide guidance under 30 CFR guidelines and do not replace mandatory certified workplace examinations or certified competent person inspections.
              </p>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
