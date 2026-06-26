'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface WorkoutSession {
  structured_data?: any;
  questionnaire_answers?: any;
  oura_rest?: string;
  oura_resilience?: string;
  oura_activity?: string;
}

export default function TrainingAssistant() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [workoutNote, setWorkoutNote] = useState('');
  const [step, setStep] = useState<'input' | 'questionnaire' | 'recommendation' | 'history'>('input');
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [questionnaire, setQuestionnaire] = useState<any[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [trainingState, setTrainingState] = useState<any>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [ouraData, setOuraData] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user);

      if (user) {
        // Get training state
        const { data: state } = await supabase
          .from('training_state')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!state) {
          // Initialize for new user
          await supabase.from('training_state').insert({
            user_id: user.id,
            current_run_level: 4,
            half_marathon_progress: 15,
          });
        } else {
          setTrainingState(state);
        }

        // Get past sessions
        const { data: sessions } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('session_date', { ascending: false })
          .limit(5);
        setPastSessions(sessions || []);
      }
    };

    getUser();
  }, []);

  const handleExtractWorkout = async () => {
    if (!workoutNote.trim() || !authUser) return;

    setLoading(true);
    try {
      // Extract structured data from note
      const extractResponse = await fetch('/api/training/extract-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser.id,
          workoutNote: workoutNote,
          runLevel: trainingState?.current_run_level || 4,
        }),
      });

      const extracted = await extractResponse.json();
      console.log('Extracted:', extracted);

      // Get Oura data
      const ouraResponse = await fetch('/api/oura/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const oura = await ouraResponse.json();
      setOuraData(oura);

      setCurrentSession({
        structured_data: extracted.data,
        oura_rest: oura.rest_level,
        oura_resilience: oura.resilience_level,
        oura_activity: oura.activity_level,
      });

      // Generate dynamic questionnaire
      const questionnaireResponse = await fetch('/api/training/get-questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser.id,
          structured_data: extracted.data,
        }),
      });

      const questions = await questionnaireResponse.json();
      setQuestionnaire(questions.questions);
      setStep('questionnaire');
    } catch (error) {
      console.error('Error extracting workout:', error);
      alert('Error processing workout');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestionnaire = async () => {
    if (!authUser || !currentSession) return;

    setLoading(true);
    try {
      // Submit and get recommendation
      const response = await fetch('/api/training/submit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser.id,
          structured_data: currentSession.structured_data,
          questionnaire_answers: questionnaireAnswers,
          oura_rest: currentSession.oura_rest,
          oura_resilience: currentSession.oura_resilience,
          oura_activity: currentSession.oura_activity,
          run_level: trainingState?.current_run_level || 4,
        }),
      });

      const result = await response.json();
      console.log('Recommendation:', result);

      setRecommendation(result);
      setStep('recommendation');

      // Refresh training state
      const { data: updated } = await supabase
        .from('training_state')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      if (updated) setTrainingState(updated);
    } catch (error) {
      console.error('Error submitting session:', error);
      alert('Error generating recommendation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWorkoutNote('');
    setStep('input');
    setCurrentSession(null);
    setQuestionnaire([]);
    setQuestionnaireAnswers({});
    setRecommendation(null);
  };

  return (
    <div className="container-main">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="card">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Half-Marathon Training Assistant</h1>
            <p className="text-gray-600 mb-6">Log your workout and get a personalized recommendation.</p>

            {/* Step: Input */}
            {step === 'input' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  What did you do today?
                </label>
                <textarea
                  value={workoutNote}
                  onChange={(e) => setWorkoutNote(e.target.value)}
                  placeholder="E.g., 'I did 5-minute jog, 2-minute walk intervals for 35 minutes. Completed all 5 rounds. Knees felt fine. Average heart rate was 150. Felt a bit tired but good.'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-base h-32"
                />
                <button
                  onClick={handleExtractWorkout}
                  disabled={!workoutNote.trim() || loading}
                  className="button-primary disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze Workout'}
                </button>
              </div>
            )}

            {/* Step: Questionnaire */}
            {step === 'questionnaire' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">A few quick questions</h2>
                <div className="space-y-4 mb-6">
                  {questionnaire.map((q, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {q.question}
                      </label>
                      {q.type === 'text' ? (
                        <input
                          type="text"
                          value={questionnaireAnswers[q.id] || ''}
                          onChange={(e) =>
                            setQuestionnaireAnswers({ ...questionnaireAnswers, [q.id]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder={q.placeholder}
                        />
                      ) : q.type === 'number' ? (
                        <input
                          type="range"
                          min="0"
                          max={q.max || 10}
                          value={questionnaireAnswers[q.id] || q.default || 0}
                          onChange={(e) =>
                            setQuestionnaireAnswers({ ...questionnaireAnswers, [q.id]: e.target.value })
                          }
                          className="w-full"
                        />
                      ) : q.type === 'select' ? (
                        <select
                          value={questionnaireAnswers[q.id] || ''}
                          onChange={(e) =>
                            setQuestionnaireAnswers({ ...questionnaireAnswers, [q.id]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Choose...</option>
                          {q.options?.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSubmitQuestionnaire}
                  disabled={loading}
                  className="button-primary disabled:opacity-50 mr-2"
                >
                  {loading ? 'Generating recommendation...' : 'Get Recommendation'}
                </button>
                <button onClick={() => setStep('input')} className="button-secondary">
                  Back
                </button>
              </div>
            )}

            {/* Step: Recommendation */}
            {step === 'recommendation' && recommendation && (
              <div>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Recommendation</h2>

                  {/* Summary */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600">Summary</p>
                    <p className="text-gray-900">{recommendation.summary}</p>
                  </div>

                  {/* Readiness */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600">Recovery Status</p>
                    <p className="text-gray-900">{recommendation.readiness}</p>
                  </div>

                  {/* Risk */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600">Risk Assessment</p>
                    <p className="text-gray-900">{recommendation.risk}</p>
                  </div>

                  {/* Primary Recommendation */}
                  <div className="mb-4 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm font-semibold text-gray-600">Next Action</p>
                    <p className="text-lg font-bold text-blue-600">{recommendation.next_action}</p>
                  </div>

                  {/* Why */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600">Why</p>
                    <p className="text-gray-900">{recommendation.reasoning}</p>
                  </div>

                  {/* Watch-outs */}
                  {recommendation.watch_outs && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm font-semibold text-gray-600">Watch-outs</p>
                      <p className="text-sm text-gray-700">{recommendation.watch_outs}</p>
                    </div>
                  )}

                  {/* Recommended Workout */}
                  {recommendation.workout && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Suggested Workout</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900">{recommendation.workout.name}</p>
                        {recommendation.workout.exercises && (
                          <ul className="text-sm text-gray-700 space-y-1">
                            {recommendation.workout.exercises.map((ex: any, i: number) => (
                              <li key={i}>
                                • {ex.name}: {ex.sets} × {ex.reps}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={resetForm} className="button-primary">
                  Log Another Workout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Progress & State */}
        <div className="space-y-4">
          {/* Progress Card */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Half-Marathon Foundation</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-bold text-blue-600">{trainingState?.half_marathon_progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${trainingState?.half_marathon_progress || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Run Level</span>
                <span className="font-semibold">Level {trainingState?.current_run_level || 4}</span>
              </div>
            </div>
          </div>

          {/* Oura Status */}
          {ouraData && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Today's Recovery</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rest</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ouraData.rest_level === 'green' ? 'bg-green-100 text-green-800' : ouraData.rest_level === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {ouraData.rest_level?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Resilience</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ouraData.resilience_level === 'green' ? 'bg-green-100 text-green-800' : ouraData.resilience_level === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {ouraData.resilience_level?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Activity</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ouraData.activity_level === 'green' ? 'bg-green-100 text-green-800' : ouraData.activity_level === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {ouraData.activity_level?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Workouts</h3>
              <div className="space-y-2">
                {pastSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-900">
                      {session.workout_type === 'run' ? '🏃' : '💪'} {session.structured_data?.workout_type || session.workout_type}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(session.session_date).toLocaleDateString()} • {session.duration_minutes} min
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
