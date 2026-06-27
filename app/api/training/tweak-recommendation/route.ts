import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { userId, currentRecommendation, tweakReason } = await request.json();

    if (!userId || !currentRecommendation || !tweakReason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`\n=== TWEAKING RECOMMENDATION FOR USER ${userId} ===`);
    console.log('Current recommendation:', JSON.stringify(currentRecommendation, null, 2));
    console.log('User tweak reason:', tweakReason);

    // Fetch latest Oura data for context
    const { data: ouraSnapshot } = await supabaseAdmin
      .from('oura_daily_snapshot')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    const tweakPrompt = `You are a conservative half-marathon training assistant analyzing a user's adjustment to their recommended workout.

Current Recommendation:
${JSON.stringify(currentRecommendation, null, 2)}

User's Reason for Adjustment:
"${tweakReason}"

Latest Oura Data:
${ouraSnapshot ? JSON.stringify(ouraSnapshot, null, 2) : 'Not available'}

Based on the user's feedback, determine if:
1. They need follow-up questions to refine the recommendation (if their reason is unclear or you need more metrics)
2. You can provide an updated recommendation immediately (if the reason is clear and actionable)

If follow-up questions are needed, ask for missing key metrics specific to their reason.
If you can update the recommendation, provide a complete updated workout prescription.

Return ONLY valid JSON (no markdown):
{
  "needsFollowUp": true or false,
  "questions": [
    {
      "id": "unique_id",
      "question": "Your question here?",
      "type": "text",
      "placeholder": "e.g., '145 bpm'",
      "guardrail": "Heart rate should be 60-180 bpm"
    }
  ],
  "updatedRecommendation": {
    "next_action": "string",
    "reasoning": "string",
    "watch_outs": "string",
    "workout": {
      "jog_interval": "text",
      "walk_interval": "text",
      "repetitions": "text",
      "speed_mph": "text"
    }
  },
  "explanation": "Brief explanation of the adjustment"
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: tweakPrompt,
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const tweakResult = JSON.parse(responseText);

    console.log('Tweak result:', JSON.stringify(tweakResult, null, 2));

    return NextResponse.json({
      questions: tweakResult.questions || [],
      updatedRecommendation: tweakResult.updatedRecommendation || null,
      explanation: tweakResult.explanation,
    });
  } catch (error) {
    console.error('Tweak recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to process tweak', details: String(error) },
      { status: 500 }
    );
  }
}
