import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { WorkoutExtraction } from '@/lib/types';

const EXTRACTION_PROMPT = `You are a running coach AI that extracts structured workout data from voice note transcripts.

Parse the user's workout note and extract the following information in JSON format. Return ONLY the JSON, no other text.

{
  "workout_type": "run" | "strength" | "mobility" | "walk_hike" | "rest" | "other",
  "completed": boolean,
  "summary": "1-2 sentence summary",
  "run": {
    "jog_minutes": number or null,
    "jog_seconds": number or null,
    "walk_minutes": number or null,
    "walk_seconds": number or null,
    "reps_planned": number or null,
    "reps_completed": number or null,
    "jog_speed_mph": number or null,
    "walk_speed_mph": number or null,
    "max_hr": number or null,
    "avg_hr": number or null,
    "hit_170": boolean or null,
    "threshold_timing": "early" | "middle" | "late" or null,
    "hr_recovery": string or null,
    "modifications": string or null
  },
  "strength": {
    "focus_area": "upper" | "lower" | "mobility" | "knee_support" | "core" or null,
    "exercises": [{"name": string, "sets": number or null, "reps": number or null, "notes": string or null}] or null,
    "intensity": "light" | "moderate" | "hard" or null
  },
  "recovery": {
    "sleep_quality": "poor" | "fair" | "good" | "excellent" or null,
    "soreness": string or null,
    "period_context": string or null,
    "alcohol": boolean or null,
    "caffeine": boolean or null,
    "fueling": "under-fueled" | "adequate" | "well-fueled" or null,
    "hydration": "dehydrated" | "adequate" | "over-hydrated" or null
  },
  "symptoms": [
    {
      "body_area": "knee" | "hip" | "shin" | "calf" | "foot" | "rib" | "other",
      "severity": 0-5 or null,
      "description": string or null,
      "affected_form": boolean or null,
      "timing": string or null
    }
  ] or null,
  "coach_observations": [string] or null
}

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- Use null for missing or unclear data
- For "5 minute jog, 2 minute walk", extract jog_minutes=5, walk_minutes=2
- If user mentions "hit 170" or "170 bpm", set hit_170=true and infer threshold_timing from context
- Be conservative: severity >= 3 means significant pain
- Coach observations note anything interesting about form, effort, recovery signals`;

export async function POST(request: NextRequest) {
  try {
    console.log('Extract request received');

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const body = await request.json();
    const { transcript } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    console.log('Calling Claude API with transcript:', transcript.substring(0, 100));

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\nWorkout note:\n${transcript}`,
        },
      ],
    });

    console.log('Claude response received');

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('Response text:', responseText.substring(0, 200));

    // Parse the JSON response
    const extraction: WorkoutExtraction = JSON.parse(responseText);
    console.log('Extraction parsed successfully');

    return NextResponse.json(extraction);
  } catch (error) {
    console.error('Extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
