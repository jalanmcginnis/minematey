'use server';

/**
 * @fileOverview MSHA Part 56/57 Safety Specialist advisor flow for workplace & equipment hazard analysis.
 */

import { GoogleGenAI } from '@google/genai';

export interface WorkplaceRecommendationInput {
  worksiteDetails: string;
  location: string;
  mineId?: string;
  mineName?: string;
}

export interface WorkplaceRecommendationOutput {
  safetyRecommendations: string;
}

const MSHA_SAFETY_SPECIALIST_SYSTEM_PROMPT = `You are an MSHA Part 56/57 Safety Specialist providing pragmatic, safety-first, concise field advice for surface and underground metal/nonmetal mining operations.

When analyzing hazards, worksite conditions, or active uncorrected workplace/equipment defects:
1. Cite applicable 30 CFR Part 56 / Part 57 standards directly in your analysis, including:
   - 30 CFR § 56.14100 / 57.14100: Safety defects; examination, correction, and records (mobile equipment pre-shift inspections; defects affecting safety must be corrected before equipment is used or tagged out).
   - 30 CFR § 56.18002 / 57.18002: Examination of working places (competent person shift exam, immediate action on conditions that may adversely affect safety or health, and notification of miners).
   - 30 CFR § 56.15005 / 57.15005: Safety belts and lines (fall protection where there is a danger of falling).
   - 30 CFR § 56.11001 / 57.11001: Safe access (safe means of access shall be provided and maintained to all working places).
   - Additional relevant 30 CFR standards as applicable (e.g., 56.9300 haul road berms/guardrails, 56.14107 machine guarding, 56.12016 lockout/tagout, 56.3130/56.3200 ground control & highwalls, 56.14132 horns/backup alarms).
2. Output a prioritized, scannable Hazard Remediation Checklist:
   - Priority 1 (Immediate Control / Red-Tag / Barricade)
   - Applicable 30 CFR Standard Citations
   - Concrete Corrective & Verification Steps for Field Crews
3. Maintain a pragmatic, safety-first, concise field tone.`;

function buildDeterministicMshaChecklist(input: WorkplaceRecommendationInput): string {
  const detailsLower = input.worksiteDetails.toLowerCase();
  const citations: string[] = [
    '• **30 CFR § 56.18002 (Examination of Working Places)**: Ensure a competent person documents the condition, notifies affected miners immediately, and barricades or posts warning signs at any hazardous area until corrected.',
  ];

  if (
    detailsLower.includes('equipment') ||
    detailsLower.includes('loader') ||
    detailsLower.includes('truck') ||
    detailsLower.includes('brake') ||
    detailsLower.includes('steering') ||
    detailsLower.includes('hydraulic') ||
    detailsLower.includes('tire') ||
    detailsLower.includes('red tag') ||
    detailsLower.includes('unit')
  ) {
    citations.push(
      '• **30 CFR § 56.14100 (Safety Defects; Examination, Correction & Records)**: Any defect on self-propelled mobile equipment that affects safety must be reported and corrected prior to operation. Tag or lock out defective equipment ("DO NOT OPERATE") until a mechanic verifies repairs.'
    );
  }

  if (
    detailsLower.includes('fall') ||
    detailsLower.includes('harness') ||
    detailsLower.includes('elevated') ||
    detailsLower.includes('platform') ||
    detailsLower.includes('lanyard')
  ) {
    citations.push(
      '• **30 CFR § 56.15005 (Safety Belts and Lines)**: Require 100% tie-off with inspected fall arrest systems whenever persons work where there is a danger of falling.'
    );
  }

  if (
    detailsLower.includes('access') ||
    detailsLower.includes('walkway') ||
    detailsLower.includes('stair') ||
    detailsLower.includes('ladder') ||
    detailsLower.includes('handrail') ||
    detailsLower.includes('slip') ||
    detailsLower.includes('housekeeping')
  ) {
    citations.push(
      '• **30 CFR § 56.11001 (Safe Access)**: Provide and maintain safe means of access to all working places; clear obstructions, repair handrails/steps, and address slip/trip hazards immediately.'
    );
  }

  if (
    detailsLower.includes('berm') ||
    detailsLower.includes('haul') ||
    detailsLower.includes('road') ||
    detailsLower.includes('dump')
  ) {
    citations.push(
      '• **30 CFR § 56.9300 (Berms or Guardrails)**: Restore haul road and dump-point berms to at least mid-axle height of the largest self-propelled mobile equipment using the roadway.'
    );
  }

  if (
    detailsLower.includes('guard') ||
    detailsLower.includes('crusher') ||
    detailsLower.includes('conveyor') ||
    detailsLower.includes('pulley')
  ) {
    citations.push(
      '• **30 CFR § 56.14107 (Moving Machine Parts)** & **30 CFR § 56.12016 (Lockout/Tagout)**: De-energize and lock out/tag out power sources before performing maintenance, and verify all pinch-point guards are secured before restart.'
    );
  }

  if (citations.length === 1) {
    citations.push(
      '• **30 CFR § 56.14100 (Equipment Pre-Shift)**, **30 CFR § 56.15005 (Fall Protection)**, & **30 CFR § 56.11001 (Safe Access)**: Verify mobile equipment pre-shift logs are current, fall protection anchorages are in place for elevated work, and all travelways remain clear.'
    );
  }

  return [
    `### MSHA Part 56/57 Prioritized Hazard Remediation Checklist`,
    `**Site / Location:** ${input.location || 'Active Mine Site'}`,
    ``,
    `#### 1. Immediate Field Controls`,
    `- Isolate and barricade any active workplace hazard (` +
      `30 CFR § 56.18002(b)) or place a visible out-of-service tag on defective mobile equipment (30 CFR § 56.14100(c)).`,
    `- Notify all miners on shift of the identified condition and restricted areas.`,
    ``,
    `#### 2. Applicable 30 CFR Standards & Compliance Actions`,
    ...citations,
    ``,
    `#### 3. Verification & Closeout`,
    `- Document the corrective action taken, date/time of abatement, and verifying supervisor/mechanic signature in the shift examination log.`,
  ].join('\n');
}

export async function workplaceRecommendation(
  input: WorkplaceRecommendationInput
): Promise<WorkplaceRecommendationOutput> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    return {
      safetyRecommendations: buildDeterministicMshaChecklist(input),
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const userPrompt = `Mine Location / Site: ${input.location}
${input.mineName ? `Mine Site Name: ${input.mineName} (${input.mineId || ''})\n` : ''}
Worksite Conditions / Active Defects to Analyze:
${input.worksiteDetails}

Provide a prioritized MSHA Part 56/57 hazard remediation checklist citing applicable 30 CFR standards (such as 56.14100, 56.18002, 56.15005, 56.11001, and any other directly relevant 30 CFR sections). Keep the guidance pragmatic, safety-first, and concise for field execution.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: MSHA_SAFETY_SPECIALIST_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    const text = response.text?.trim();
    if (text) {
      return { safetyRecommendations: text };
    }

    return {
      safetyRecommendations: buildDeterministicMshaChecklist(input),
    };
  } catch (error) {
    console.error('Error in workplaceRecommendation Gemini API call:', error);
    return {
      safetyRecommendations: buildDeterministicMshaChecklist(input),
    };
  }
}
