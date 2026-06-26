import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { structured_data } = await request.json();

    const questionnairePrompt = `You are a beginner running coach. Based on extracted workout data, generate 3-6 dynamic follow-up questions.

Extracted data:
${JSON.stringify(structured_data, null, 2)}

Generate follow-up questions ONLY for:
1. Missing or unclear fields
2. Concerning signals (high pain, fatigue, warning signs)
3. Readiness to progress
4. Recovery needs

Return ONLY valid JSON array (no markdown, no code fence) with questions:

[
  {
    "id": "unique_id",
    "question": "Your question here?",
    "type": "text|number|select",
    "placeholder": "optional placeholder",
    "default": 0,
    "max": 10,
    "options": ["option1", "option2"]
  }
]

Examples:
- If knee_pain is missing: Ask "What was your knee pain from 0-10?"
- If knee_pain > 0: Ask "Was the knee pain sharp, dull, or sore?"
- If perceived_effort > 8: Ask "Did you feel like you could continue or were you near your limit?"
- If completed == false: Ask "What caused you to stop?"
- If fatigue is high: Ask "Are you more tired than usual today?"

Keep questions brief and practical. Max 6 questions.`;

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
