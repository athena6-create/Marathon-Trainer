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
  "jog_interval": "text (e.g., '5 min', '5:30')|null",
  "walk_interval": "text (e.g., '2 min', '2:00')|null",
  "repetitions": "number (e.g., 5) or null",
  "speed_mph": "number or null",
  "avg_heart_rate": number|null,
  "max_heart_rate": number|null,
  "aerobic_difficulty": 1-10 number|null,
  "general_soreness": 0-10 number|null,
  "fatigue": 0-10 number|null,
  "breathing_difficulty": 0-10 number|null,
  "mood": "string|null",
  "warning_signs": ["list of any sharp pain, worsening pain, limping, swelling, dizziness, chest pain, unusual HR"]
}

CRITICAL FOR RUNS: These 6 metrics are essential. Extract ALL of them or use null:
1. jog_interval (e.g., "5:00", "5 min")
2. walk_interval (e.g., "2:00", "2 min")
3. repetitions (number of jog/walk rounds)
4. speed_mph (pace, e.g., 5.5, 6.0)
5. avg_heart_rate (number)
6. max_heart_rate (number)

Special instructions:
- For runs: Extract all 6 metrics above. If user mentions intervals, parse exact times.
- distance_description: Keep as text (e.g., "5 miles", "3K")
- aerobic_difficulty: How hard was it to breathe? 1-10 scale
- If any of the 6 metrics is missing, set to null (questionnaire will ask follow-up)

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
