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
  "workout_type": "run|walk|strength|mobility|rest|cross-training",
  "completed": true|false,
  "duration_minutes": number|null,
  "distance_miles": number|null,
  "avg_heart_rate": number|null,
  "max_heart_rate": number|null,
  "perceived_effort": 1-10 number|null,
  "knee_pain": 0-10 number|null,
  "general_soreness": 0-10 number|null,
  "fatigue": 0-10 number|null,
  "breathing_difficulty": 0-10 number|null,
  "intervals": "description of intervals (e.g., '5 min jog / 2 min walk x 5')|null",
  "mood": "string|null",
  "warning_signs": ["list of any sharp pain, worsening pain, limping, swelling, dizziness, chest pain, unusual HR"]
}

Be conservative. If unsure about a value, use null. For pain/effort scales, infer from language like "sore", "tired", "great", etc.`;

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
