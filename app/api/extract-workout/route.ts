import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { WorkoutExtraction } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `You are a running coach AI that extracts structured workout data from voice note transcripts.

Parse the user's workout note and extract the following information in JSON format:

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
    "hr_recovery": string or null (e.g. "recovered to 120s"),
    "modifications": string or null
  },
  "strength": {
    "focus_area": "upper" | "lower" | "mobility" | "knee_support" | "core" or null,
    "exercises": [{"name": string, "sets": number or null, "reps": number or null, "notes": string or null}] or null,
    "intensity": "light" | "moderate" | "hard" or null
  },
  "recovery": {
    "sleep_quality": "poor" | "fair" | "good" | "excellent" or null,
    "soreness": string or null (body area + severity),
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
      "timing": string or null (e.g. "during rep 3", "next morning")
    }
  ] or null,
  "coach_observations": [string] or null
}

Rules:
- Return ONLY valid JSON, no other text
- Use null for missing or unclear data
- For run intervals like "5 minute jog, 2 minute walk", extract jog_minutes=5, walk_minutes=2
- If user mentions "hit 170" or "170 bpm", set hit_170=true and infer threshold_timing from context
- For soreness, extract body area and severity (1-5 scale)
- Be conservative with pain severity (>= 3 means significant)
- Coach observations should note anything interesting about form, effort, recovery signals`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const message = await openai.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\nWorkout note:\n${transcript}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    const extraction: WorkoutExtraction = JSON.parse(responseText);

    return NextResponse.json(extraction);
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      { status: 500 }
    );
  }
}
