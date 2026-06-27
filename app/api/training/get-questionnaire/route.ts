import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { structured_data, oura_data } = await request.json();

    const questionnairePrompt = `You are a beginner running coach. Based on extracted workout data, generate 2-4 dynamic follow-up questions.

Extracted workout data:
${JSON.stringify(structured_data, null, 2)}

Available Oura data (from user's ring):
${JSON.stringify(oura_data, null, 2)}

FOR RUNS: ALWAYS ask for missing metrics from this critical set:
- jog_interval (e.g., "How long was your jog interval?" - e.g., 5 minutes)
- walk_interval (e.g., "How long was your walk interval?" - e.g., 2 minutes)
- repetitions (e.g., "How many jog/walk rounds did you complete?")
- speed_mph (e.g., "At what pace did you run?" - e.g., 5.5 mph)
- avg_heart_rate (e.g., "What was your average heart rate?")
- max_heart_rate (e.g., "What was your maximum heart rate?")
- aerobic_difficulty (e.g., "On a scale of 1-10, how hard was it to breathe?")
- distance_description (e.g., "How far did you run?")

Generate follow-up questions for:
1. ANY missing run metrics (from the 8 above for run/run-walk workouts)
2. Concerning signals (high fatigue, warning signs)
3. Recovery assessment (only if NOT covered by Oura data)
4. Readiness to progress (completed workout, effort level)

DO NOT ask about:
- Sleep/hours slept (we have Oura sleep_score and sleep_duration)
- Knee pain, specific body areas, or anything already captured
- Any metric that Oura already has

Return ONLY valid JSON array (no markdown, no code fence). ALL questions are free text with guardrails:

[
  {
    "id": "unique_id",
    "question": "Your question here?",
    "type": "text",
    "placeholder": "e.g., '145 bpm' or 'around 150, felt elevated'",
    "guardrail": "Heart rate should be 60-180 bpm"
  }
]

CRITICAL: ALL questions must be FREE TEXT (type: "text") with guardrails.

Examples:
- If jog_interval missing: "What was your jog interval?" (type: text, placeholder: "e.g., 5 min, 5:30, 5 minutes")
- If walk_interval missing: "What was your walk interval?" (type: text, placeholder: "e.g., 2 min, 1:30")
- If repetitions missing: "How many jog/walk rounds?" (type: text, placeholder: "e.g., 5, 5 rounds, 5x")
- If speed_mph missing: "What pace did you run?" (type: text, placeholder: "e.g., 5.5 mph, 6 mph", guardrail: "Speed should be 2-15 mph")
- If avg_heart_rate missing: "Average heart rate?" (type: text, placeholder: "e.g., 145 bpm, around 150", guardrail: "Heart rate should be 60-180 bpm")
- If max_heart_rate missing: "Maximum heart rate?" (type: text, placeholder: "e.g., 165 bpm, peaked at 170", guardrail: "Heart rate should be 60-180 bpm")
- If distance_description missing: "How far did you run?" (type: text, placeholder: "e.g., 3 miles, 5K, about 2 miles")
- If aerobic_difficulty missing: "How hard was it to breathe?" (type: text, placeholder: "e.g., 6/10, moderate, could hold conversation", guardrail: "Use 1-10 scale or describe effort")
- If completed == false: "What caused you to stop early?" (type: text, placeholder: "e.g., cramping, felt sick, time ran out")
- If fatigue is high: "How do you feel recovery-wise?" (type: text, placeholder: "e.g., very tired, exhausted, need sleep", guardrail: "Describe your fatigue level")

Guardrails:
- Heart rate: 60-180 bpm
- Speed: 2-15 mph
- Distance: any text (miles, km, laps, etc.)
- Time: any text (minutes, seconds, rounds)
- Effort/difficulty: 1-10 scale or text description
- Fatigue/soreness: 0-10 scale or text description

Keep questions brief, practical. Max 4 questions. NO sliders, NO multiple choice - ALL free text.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: questionnairePrompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const questions = JSON.parse(responseText);

    console.log('Generated questions:', questions);

    return NextResponse.json({
      success: true,
      questions: questions || [],
    });
  } catch (error) {
    console.error('Questionnaire error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questionnaire', details: String(error) },
      { status: 500 }
    );
  }
}
