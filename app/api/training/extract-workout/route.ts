import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { workoutNote, runLevel } = await request.json();

    if (!workoutNote) {
      return NextResponse.json({ error: 'Missing workout note' }, { status: 400 });
    }

    const extractionPrompt = `You are a beginner running coach analyzing a workout log entry. Extract structured data from this workout note.

User's current run level: ${runLevel}

Workout note:
"${workoutNote}"

Extract and return ONLY valid JSON (no markdown, no code fence) with these fields. Use null for missing values:

{
  "workout_type": "run|run/walk|walk|strength|mobility|rest|cross-training",
  "completed": true|false,
  "duration_minutes": number|null,
  "distance_description": "text description (e.g., '3 miles', '5K', 'about 2 miles')|null",
  "avg_heart_rate": number|null,
  "max_heart_rate": number|null,
  "aerobic_difficulty": 1-10 number|null,
  "general_soreness": 0-10 number|null,
  "fatigue": 0-10 number|null,
  "breathing_difficulty": 0-10 number|null,
  "intervals": "description of intervals (e.g., '5 min jog / 2 min walk x 5')|null",
  "mood": "string|null",
  "warning_signs": ["list of any sharp pain, worsening pain, limping, swelling, dizziness, chest pain, unusual HR"]
}

Special instructions:
- workout_type: Set to "run/walk" if they mention both running AND walking. Set to "run" if only running. Set to "walk" if only walking.
- distance_description: Keep as text (e.g., "5 miles", "3K", "didn't track distance")
- aerobic_difficulty: How hard was it to breathe? Rate based on language like "huffing", "breathless", "easy breathing", "out of breath"
- general_soreness: How does the body feel overall (muscle soreness, fatigue in legs, etc)?
- breathing_difficulty: Alias for how much cardio/aerobic challenge it was

Be conservative. If unsure, use null.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON response
    const extracted = JSON.parse(responseText);

    console.log('Extracted workout:', extracted);

    return NextResponse.json({
      success: true,
      data: extracted,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract workout data', details: String(error) },
      { status: 500 }
    );
  }
}
