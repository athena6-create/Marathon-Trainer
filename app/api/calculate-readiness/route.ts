import { NextRequest, NextResponse } from 'next/server';
import type { Symptom } from '@/lib/types';

interface ReadinessInput {
  sleep_quality?: 'poor' | 'fair' | 'good' | 'excellent';
  soreness?: number; // 1-5 from last strength workout
  symptoms?: Symptom[];
  last_run_difficulty?: number; // 1-10
  hours_since_last_run?: number;
  hours_since_lower_body?: number;
  alcohol?: boolean;
  period_symptoms?: number; // 1-5
  subjective_energy?: number; // 1-10
}

export async function POST(request: NextRequest) {
  try {
    const input: ReadinessInput = await request.json();

    // Start with base score
    let readiness = 100;
    const penalties: string[] = [];
    const bonuses: string[] = [];

    // Sleep quality penalty/bonus
    switch (input.sleep_quality) {
      case 'poor':
        readiness -= 20;
        penalties.push('Poor sleep (-20)');
        break;
      case 'fair':
        readiness -= 10;
        penalties.push('Fair sleep (-10)');
        break;
      case 'good':
        bonuses.push('Good sleep (+10)');
        readiness += 10;
        break;
      case 'excellent':
        bonuses.push('Excellent sleep (+10)');
        readiness += 10;
        break;
    }

    // Soreness from previous strength
    if (input.soreness) {
      const sorenessPenalty = Math.min(input.soreness * 3, 15);
      readiness -= sorenessPenalty;
      penalties.push(`Soreness (${input.soreness}/5) (-${sorenessPenalty})`);
    }

    // Pain/symptoms
    if (input.symptoms && input.symptoms.length > 0) {
      input.symptoms.forEach((symptom) => {
        const severity = symptom.severity || 0;
        if (severity >= 3) {
          readiness -= 20;
          penalties.push(`${symptom.body_area} pain (severity ${severity}) (-20)`);
        } else if (severity > 0) {
          readiness -= 5;
          penalties.push(`${symptom.body_area} discomfort (-5)`);
        }
      });
    }

    // Last run difficulty
    if (input.last_run_difficulty && input.last_run_difficulty > 7) {
      if (input.hours_since_last_run && input.hours_since_last_run < 48) {
        readiness -= 10;
        penalties.push('Hard run in last 48h (-10)');
      }
    }

    // Lower body strength
    if (input.hours_since_lower_body && input.hours_since_lower_body < 24 && input.soreness) {
      readiness -= 15;
      penalties.push('Lower body strength < 24h ago with soreness (-15)');
    }

    // Alcohol/hangover
    if (input.alcohol) {
      readiness -= 15;
      penalties.push('Alcohol/hangover (-15)');
    }

    // Period symptoms
    if (input.period_symptoms && input.period_symptoms >= 3) {
      readiness -= 10;
      penalties.push(`Period symptoms (${input.period_symptoms}/5) (-10)`);
    }

    // Subjective energy
    if (input.subjective_energy && input.subjective_energy < 5) {
      readiness -= 10;
      penalties.push(`Low energy (${input.subjective_energy}/10) (-10)`);
    }

    // Clamp to 0-100
    readiness = Math.max(0, Math.min(100, readiness));

    // Determine risk level
    let risk_level: 'green' | 'yellow' | 'red';
    if (readiness >= 80) {
      risk_level = 'green';
    } else if (readiness >= 60) {
      risk_level = 'yellow';
    } else if (readiness >= 40) {
      risk_level = 'yellow';
    } else {
      risk_level = 'red';
    }

    return NextResponse.json({
      readiness,
      risk_level,
      breakdown: {
        penalties,
        bonuses,
      },
    });
  } catch (error) {
    console.error('Readiness calculation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Calculation failed',
      },
      { status: 500 }
    );
  }
}
