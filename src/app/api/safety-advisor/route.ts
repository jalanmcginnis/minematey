import { NextRequest, NextResponse } from 'next/server';
import { workplaceRecommendation } from '@/ai/flows/workplace-recommendation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { worksiteDetails, location, mineId, mineName } = body;

    if (!worksiteDetails || typeof worksiteDetails !== 'string') {
      return NextResponse.json(
        { error: 'Worksite details or defect list is required.' },
        { status: 400 }
      );
    }

    const result = await workplaceRecommendation({
      worksiteDetails,
      location: location || 'Active Mine Site',
      mineId,
      mineName,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/safety-advisor POST route:', error);
    return NextResponse.json(
      {
        error:
          error?.message || 'Failed to generate MSHA safety recommendations.',
      },
      { status: 500 }
    );
  }
}
