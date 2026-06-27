import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { structured_data } = await request.json();

    const questionnairePrompt = `You are a beginner running coach. Based on extracted workout data, generate 2-4 dynamic follow-up questions.

Extracted data:
${JSON.stringify(structured_data, null, 2)}

Generate follow-up questions ONLY for:
1. Missing key fields (distance_description, aerobic_difficulty, general_soreness)
2. Concerning signals (high fatigue, warning signs)
3. Readiness to progress (completed workout, effort level)
4. Recovery assessment

DO NOT ask about: knee pain, specific body areas, or anything already captured

Return ONLY valid JSON array (no markdown, no code fence) with questions:

[
  {
    "id": "unique_id",
    "question": "Your question here?",
    "type": "text|number|select",
    "placeholder": "optional placeholder",
    "default": 5,
    "max": 10,
    "options": ["option1", "option2"]
  }
]

Examples:
- If distance_description is missing: Ask "How far did you run/walk (in miles or kilometers)?" (type: text)
- If aerobic_difficulty is missing: Ask "How hard was it to breathe? (1=easy, 10=couldn't catch breath)" (type: number, max: 10)
- If general_soreness is missing: Ask "How sore does your body feel overall? (1=fresh, 10=very sore)" (type: number, max: 10)
- If completed == false: Ask "What caused you to stop or cut it short?" (type: text)
- If fatigue is high: Ask "How recovered do you feel today? (1=exhausted, 10=fresh)" (type: number, max: 10)

Keep questions brief, practical, and focused on overall experience. Max 4 questions.`;

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
