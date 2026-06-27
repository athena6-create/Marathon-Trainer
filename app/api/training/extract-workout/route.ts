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

Extract and return ONLY valid JSON (no markdown, no code fence). ALL fields are FREE TEXT to capture nuance and context:

{
  "workout_type": "run|run/walk|walk|strength|mobility|rest|cross-training",
  "completed": true|false,
  "duration_minutes": "free text (e.g., '40 min', '35-40 minutes')|null",
  "distance_description": "free text (e.g., '3 miles', '5K', 'about 2 miles, didn't track exactly')|null",
  "jog_interval": "free text (e.g., '5 min, felt easy', '5:30, quicker than usual')|null",
  "walk_interval": "free text (e.g., '2 min, good recovery', '1:30 short breaks')|null",
  "repetitions": "free text (e.g., '5 rounds', '6x', 'lost count after 4')|null",
  "speed_mph": "free text (e.g., '5.5 mph', '6 mph, faster today', 'around 5 mph')|null",
  "avg_heart_rate": "free text (e.g., '145 bpm', '140-150, elevated due to heat', 'around 150')|null",
  "max_heart_rate": "free text (e.g., '165 bpm', '160, spiked at the end', '155-160 range')|null",
  "aerobic_difficulty": "free text (e.g., '6/10, could hold conversation', '7/10, breathing hard', 'moderate effort')|null",
  "general_soreness": "free text (e.g., '3/10, legs slightly tight', '2/10, quads a bit sore', 'no soreness')|null",
  "fatigue": "free text (e.g., '4/10, still energized', '7/10, tired at the end', 'moderate')|null",
  "mood": "free text (e.g., 'excellent, felt strong', 'frustrated with pace', 'good overall')|null",
  "warning_signs": ["list of any pain, discomfort, or concerns"]
}

CRITICAL FOR RUNS: Extract these 6 fields as FREE TEXT with context:
1. jog_interval (include pace/effort notes if mentioned)
2. walk_interval (include how it felt)
3. repetitions (number of rounds + notes)
4. speed_mph (include pace variation or how it compared to usual)
5. avg_heart_rate (include context: elevated from heat, lower than usual, etc.)
6. max_heart_rate (include when it spiked or why)

Special instructions:
- Capture EVERYTHING as text - user's exact words, context, comparisons
- Example: "5:30 jog, felt faster than yesterday" vs just "5:30"
- Example: "145 bpm average, probably high because of humidity" vs just "145"
- Include notes about changes: "pace was faster", "HR lower despite harder effort", etc.
- This allows Claude to capture personal patterns and context in analysis

If a metric is completely missing, use null (questionnaire will ask follow-up).`;

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
