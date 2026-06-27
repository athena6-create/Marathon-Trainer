'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, AthleteProfile, Recommendation } from '@/lib/types';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [ouraStatus, setOuraStatus] = useState<any>(null);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatNote, setRepeatNote] = useState('');
  const [repeatLoading, setRepeatLoading] = useState(false);

  // Training assistant state
  const [trainingState, setTrainingState] = useState<any>(null);
  const [workoutNote, setWorkoutNote] = useState('');
  const [trainingStep, setTrainingStep] = useState<'input' | 'questionnaire' | 'analysis' | 'recommendation' | 'accept-tweak'>('input');
  const [analysisText, setAnalysisText] = useState('');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [questionnaire, setQuestionnaire] = useState<any[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [trainingRecommendation, setTrainingRecommendation] = useState<any>(null);
  const [tweakingNote, setTweakingNote] = useState('');
  const [isTweaking, setIsTweaking] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  const syncOuraData = async (userId: string) => {
    try {
      console.log('🔄 Syncing Oura data...');
      setSyncing(true);
      const syncResponse = await fetch('/api/oura/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const syncData = await syncResponse.json();
      console.log('✅ Sync result:', JSON.stringify(syncData, null, 2));

      if (syncData.error) {
        console.error('❌ Sync error:', syncData.error);
        alert(`Sync failed: ${syncData.error}`);
        return;
      }

      if (syncData.synced_days) {
        console.log(`📊 Synced ${syncData.synced_days} days of data`);
        if (syncData.snapshots && syncData.snapshots.length > 0) {
          const latestDate = syncData.snapshots[0].snapshot_date;
          console.log(`📅 Latest data: ${latestDate}`);
        }
      }

      // Fetch updated status
      const ouraResponse = await fetch('/api/oura/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const ouraData = await ouraResponse.json();
      console.log('🎯 Updated Oura data:', ouraData);
      setOuraStatus(ouraData);
    } catch (error) {
      console.error('❌ Error syncing Oura data:', error);
      alert(`Sync error: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Dashboard loading...');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          window.location.href = '/auth/login';
          return;
        }
        console.log('Auth user loaded:', authUser.id);

        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email || 'Runner',
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        const { data: profileData } = await supabase
          .from('athlete_profile')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        console.log('Syncing Oura data...');
        await syncOuraData(authUser.id);

        console.log('Generating recommendation...');
        const recResponse = await fetch('/api/recommendation/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id }),
        });
        const recData = await recResponse.json();

        // Load latest recommendation from database
        const { data: latestRec } = await supabase
          .from('recommendations')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (latestRec && latestRec.length > 0) {
          console.log('Latest recommendation loaded:', latestRec[0]);
        }

        if (recData.run_prescription) {
          setRecommendation({
            id: 'generated',
            user_id: authUser.id,
            triggered_by_workout_id: null,
            recommended_date: new Date().toISOString().split('T')[0],
            workout_type: 'run',
            run_prescription: recData.run_prescription,
            rationale: recData.rationale,
            readiness_score: recData.oura_readiness,
            risk_level: recData.oura_readiness >= 80 ? 'green' : recData.oura_readiness >= 60 ? 'yellow' : 'red',
            user_acknowledged: false,
            user_overridden: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            next_workout: recData.next_workout,
            rest_status: recData.rest_status,
          } as any);
          setReadinessScore(recData.oura_readiness);
        }

        // Get training state
        const { data: state } = await supabase
          .from('training_state')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (state) {
          setTrainingState(state);
        } else {
          await supabase.from('training_state').insert({
            user_id: authUser.id,
            current_run_level: 4,
            half_marathon_progress: 15,
          });
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(10);
      setWorkoutHistory(data || []);
    };
    if (user) loadHistory();
  }, [user]);

  const getRunLevelString = () => {
    if (!profile) return 'N/A';
    return `${profile.current_run_level_jog_minutes}:${String(profile.current_run_level_jog_seconds).padStart(2, '0')} jog / ${profile.current_run_level_walk_minutes}:${String(profile.current_run_level_walk_seconds).padStart(2, '0')} walk x${profile.current_run_level_reps_min}${profile.current_run_level_reps_max ? `-${profile.current_run_level_reps_max}` : ''} @ ${profile.preferred_jog_speed_mph || 4.6} mph`;
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const syncDate = new Date(timestamp);
    const diffMs = now.getTime() - syncDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Synced ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `Synced ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just synced';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) {
      // Green gradient: subtle shades
      if (score >= 95) return 'from-green-200 to-green-100';
      if (score >= 90) return 'from-green-200 to-green-100';
      if (score >= 85) return 'from-green-200 to-green-50';
      return 'from-green-100 to-green-50';
    } else if (score >= 60) {
      // Yellow gradient: subtle transitions
      if (score >= 75) return 'from-yellow-200 to-green-100';
      if (score >= 70) return 'from-yellow-200 to-yellow-100';
      return 'from-yellow-200 to-yellow-50';
    } else {
      // Red gradient: subtle at lower scores
      if (score < 30) return 'from-red-200 to-red-100';
      if (score < 45) return 'from-red-200 to-red-100';
      return 'from-red-100 to-orange-50';
    }
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-900';
    if (score >= 60) return 'text-yellow-900';
    return 'text-red-900';
  };

  const getMetricColor = (score: number | null) => {
    if (score === null || score === undefined) {
      return { backgroundColor: 'rgb(248, 249, 250)', color: 'rgb(75, 85, 99)' };
    }

    // Pastel color scale - very light backgrounds with dark popping text
    let backgroundColor, textColor;

    if (score < 50) {
      // Pastel red
      backgroundColor = 'rgb(255, 230, 230)'; // Very light pastel red
      textColor = 'rgb(100, 20, 20)'; // Dark red text
    } else if (score < 75) {
      // Pastel yellow
      backgroundColor = 'rgb(255, 250, 210)'; // Very light pastel yellow
      textColor = 'rgb(100, 80, 0)'; // Dark yellow-brown text
    } else {
      // Pastel green
      backgroundColor = 'rgb(230, 250, 225)'; // Very light pastel green
      textColor = 'rgb(20, 80, 30)'; // Dark green text
    }

    return {
      backgroundColor,
      color: textColor,
    };
  };

  const handleRepeatPrevious = async () => {
    if (!user || !profile) return;
    setRepeatLoading(true);
    try {
      const response = await fetch('/api/save-pending-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          note: repeatNote,
          jog_minutes: profile.current_run_level_jog_minutes,
          jog_seconds: profile.current_run_level_jog_seconds,
          walk_minutes: profile.current_run_level_walk_minutes,
          walk_seconds: profile.current_run_level_walk_seconds,
          reps_min: profile.current_run_level_reps_min,
          reps_max: profile.current_run_level_reps_max,
          speed_mph: profile.preferred_jog_speed_mph,
        }),
      });

      if (!response.ok) throw new Error('Failed to save workout');

      alert('Workout added to history! You can log the details after you run.');
      setShowRepeatModal(false);
      setRepeatNote('');
      window.location.reload();
    } catch (error) {
      console.error('Error saving pending workout:', error);
      alert('Failed to save workout');
    } finally {
      setRepeatLoading(false);
    }
  };

  const handleExtractWorkout = async () => {
    if (!workoutNote.trim() || !user) return;

    setTrainingLoading(true);
    try {
      const extractResponse = await fetch('/api/training/extract-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          workoutNote: workoutNote,
          runLevel: trainingState?.current_run_level || 4,
        }),
      });

      const extracted = await extractResponse.json();

      setCurrentSession({
        structured_data: extracted.data,
        oura_rest: ouraStatus?.rest_level,
        oura_resilience: ouraStatus?.resilience_level,
        oura_activity: ouraStatus?.activity_level,
      });

      const questionnaireResponse = await fetch('/api/training/get-questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          structured_data: extracted.data,
          oura_data: {
            sleep_score: ouraStatus?.todaySnapshot?.sleep_score,
            sleep_duration: ouraStatus?.todaySnapshot?.sleep_duration,
            resilience_score: ouraStatus?.resilience_score,
            activity_score: ouraStatus?.activity_score,
          },
        }),
      });

      const questions = await questionnaireResponse.json();
      setQuestionnaire(questions.questions);
      setTrainingStep('questionnaire');
    } catch (error) {
      console.error('Error extracting workout:', error);
      alert('Error processing workout');
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleSubmitQuestionnaire = async () => {
    if (!user || !currentSession) return;

    setTrainingLoading(true);
    try {
      const response = await fetch('/api/training/submit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          structured_data: currentSession.structured_data,
          questionnaire_answers: questionnaireAnswers,
          oura_snapshot: {
            sleep_score: ouraStatus?.todaySnapshot?.sleep_score,
            sleep_duration: ouraStatus?.todaySnapshot?.sleep_duration,
            resilience_score: ouraStatus?.resilience_score,
            activity_score: ouraStatus?.activity_score,
            hrv: ouraStatus?.todaySnapshot?.hrv,
            resting_heart_rate: ouraStatus?.todaySnapshot?.resting_heart_rate,
          },
          run_level: trainingState?.current_run_level || 4,
        }),
      });

      const result = await response.json();
      console.log('📊 Recommendation response:', result);
      setTrainingRecommendation(result);

      // Show analysis first, with summary + readiness assessment
      const analysis = `${result.summary || ''}\n\n${result.readiness || ''}\n\n${result.reasoning || ''}`;
      console.log('📋 Analysis text:', analysis);
      setAnalysisText(analysis);
      setTrainingStep('analysis');

      // Refresh workout history in background
      console.log('🔄 Refreshing workout history...');
      try {
        const { data: sessions, error: histError } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('session_date', { ascending: false })
          .limit(10);
        if (histError) {
          console.error('❌ History fetch error:', histError);
        } else {
          console.log('✅ Loaded', sessions?.length || 0, 'recent workouts');
          if (sessions) setWorkoutHistory(sessions);
        }
      } catch (err) {
        console.error('Error refreshing history:', err);
      }
    } catch (error) {
      console.error('Error submitting session:', error);
      alert('Error generating recommendation');
    } finally {
      setTrainingLoading(false);
    }
  };

  const saveRecommendationToDb = async (rec: any, feedback?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('recommendations')
        .upsert({
          user_id: user.id,
          workout_date: new Date().toISOString().split('T')[0],
          next_action: rec.next_action,
          workout_name: rec.workout?.name,
          exercises: rec.workout?.exercises,
          reasoning: rec.reasoning,
          watch_outs: rec.watch_outs,
          user_feedback: feedback || null,
          is_accepted: true,
        });
      if (error) console.error('Save recommendation error:', error);
    } catch (err) {
      console.error('Error saving recommendation:', err);
    }
  };

  const resetTrainingForm = () => {
    setWorkoutNote('');
    setTrainingStep('input');
    setCurrentSession(null);
    setQuestionnaire([]);
    setQuestionnaireAnswers({});
    setTrainingRecommendation(null);
    setAnalysisText('');
    setTweakingNote('');
    setIsTweaking(false);
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setWorkoutNote((prev) => prev + (prev ? ' ' : '') + transcript);
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        alert(`Error: ${event.error}`);
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
    }
  };


  if (loading) {
    return (
      <div className="container-main">
        <div className="card">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col">
        {/* Oura Ring Metrics */}
        {ouraStatus ? (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Oura Ring Metrics</h2>
                {ouraStatus.todaySnapshot?.snapshot_date && (
                  <p className="text-sm text-gray-400">
                    {new Date(ouraStatus.todaySnapshot.snapshot_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={() => user && syncOuraData(user.id)}
                disabled={syncing}
                className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                {syncing ? '⟳ Syncing...' : '⟳ Sync Now'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Resilience */}
              <div
                className="p-4 rounded-lg border transition-colors"
                style={{
                  ...getMetricColor(ouraStatus.resilience_score),
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <p className="text-xs font-semibold mb-2" style={{ opacity: 0.7 }}>
                  Resilience
                </p>
                <p className="text-4xl font-bold">
                  {ouraStatus.resilience_score !== undefined && ouraStatus.resilience_score !== null
                    ? ouraStatus.resilience_score
                    : '—'}
                </p>
              </div>

              {/* Rest */}
              <div
                className="p-4 rounded-lg border transition-colors"
                style={{
                  ...getMetricColor(ouraStatus.rest_score),
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <p className="text-xs font-semibold mb-2" style={{ opacity: 0.7 }}>
                  Rest
                </p>
                <p className="text-4xl font-bold">
                  {ouraStatus.rest_score !== undefined && ouraStatus.rest_score !== null
                    ? ouraStatus.rest_score
                    : '—'}
                </p>
              </div>

              {/* Activity */}
              <div
                className="p-4 rounded-lg border transition-colors"
                style={{
                  ...getMetricColor(ouraStatus.activity_score),
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <p className="text-xs font-semibold mb-2" style={{ opacity: 0.7 }}>
                  Activity
                </p>
                <p className="text-4xl font-bold">
                  {ouraStatus.activity_score !== undefined && ouraStatus.activity_score !== null
                    ? ouraStatus.activity_score
                    : '—'}
                </p>
              </div>
            </div>
            {!ouraStatus.connected && (
              <p className="text-xs text-gray-500 mt-4">Oura not connected</p>
            )}
          </div>
        ) : (
          <div className="card mb-6 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-gray-700 mb-2">Connect your Oura Ring to see Oura Ring Metrics.</p>
            <Link href="/profile" className="text-blue-600 font-semibold text-sm hover:underline">
              Go to Settings →
            </Link>
          </div>
        )}

        {/* Current Run Level */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Current Run Level</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Jog Interval</p>
              <p className="text-lg font-medium text-blue-600">{profile?.current_run_level_jog_minutes}:{String(profile?.current_run_level_jog_seconds || 0).padStart(2, '0')} min</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Walk Interval</p>
              <p className="text-lg font-medium text-blue-600">{profile?.current_run_level_walk_minutes}:{String(profile?.current_run_level_walk_seconds || 0).padStart(2, '0')} min</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Repetitions</p>
              <p className="text-lg font-medium text-blue-600">{profile?.current_run_level_reps_min}-{profile?.current_run_level_reps_max}x</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Speed</p>
              <p className="text-lg font-medium text-blue-600">{profile?.preferred_jog_speed_mph || 4.6} mph</p>
            </div>
          </div>
        </div>

        {/* Recommended Workout */}
        {recommendation ? (
          <div className="card mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Next Recommended Workout</h2>
                <button
                  onClick={async () => {
                    // Fetch the latest recommendation from database
                    const { data } = await supabase
                      .from('recommendations')
                      .select('*')
                      .eq('user_id', user?.id)
                      .order('created_at', { ascending: false })
                      .limit(1);
                    if (data && data.length > 0) {
                      setSelectedRecommendation(data[0]);
                      setShowRecommendationModal(true);
                    }
                  }}
                  className="text-gray-400 hover:text-blue-600 transition-colors text-lg font-semibold"
                  title="View full recommendation details"
                >
                  ℹ️
                </button>
              </div>
              {(recommendation as any).rest_status && !(recommendation as any).rest_status.ready && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Ready in {(recommendation as any).rest_status.hours_until_ready}h
                </span>
              )}
              {(recommendation as any).rest_status && (recommendation as any).rest_status.ready && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Ready Now ✓
                </span>
              )}
            </div>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                {recommendation.workout_type.toUpperCase()}
              </span>
            </div>

            {recommendation.run_prescription && recommendation.run_prescription.jog_minutes && (
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p className="font-semibold text-gray-900 mb-3">Run Prescription:</p>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Jog Interval</p>
                    <p className="font-medium text-gray-700">{recommendation.run_prescription.jog_minutes}:{String(recommendation.run_prescription.jog_seconds).padStart(2, '0')} min</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Walk Interval</p>
                    <p className="font-medium text-gray-700">{recommendation.run_prescription.walk_minutes}:{String(recommendation.run_prescription.walk_seconds).padStart(2, '0')} min</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Repetitions</p>
                    <p className="font-medium text-gray-700">{recommendation.run_prescription.reps_min}-{recommendation.run_prescription.reps_max}x</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Speed</p>
                    <p className="font-medium text-gray-700">{recommendation.run_prescription.speed_mph} mph</p>
                  </div>
                </div>
              </div>
            )}

            {(recommendation as any).workout_details && (recommendation as any).workout_details.exercises && (
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p className="font-semibold text-gray-900 mb-3">{(recommendation as any).workout_details.name}</p>
                <div className="space-y-2">
                  {(recommendation as any).workout_details.exercises.map((ex: any, i: number) => (
                    <div key={i} className="border-l-4 border-blue-300 pl-3 py-1">
                      <p className="font-medium text-gray-900">{ex.name}</p>
                      <p className="text-sm text-gray-600">
                        {ex.sets} sets × {ex.reps}
                        {ex.weight && ` @ ${ex.weight}`}
                        {ex.duration && ` - ${ex.duration}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">Rationale:</p>
              <p className="text-gray-700 text-sm">{recommendation.rationale}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
                💡 You can modify any part of this prescription before logging your workout. The app learns from your notes and adjusts future recommendations.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await supabase
                      .from('recommendations')
                      .update({ user_acknowledged: true })
                      .eq('id', recommendation.id);
                    alert('Acknowledged!');
                    window.location.reload();
                  }}
                  className="button-primary flex-1"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => {
                    alert('Tweak feature coming soon! You can modify: interval duration, reps, speed.');
                  }}
                  className="button-secondary flex-1"
                >
                  Tweak
                </button>
                <button
                  onClick={() => setShowRepeatModal(true)}
                  className="button-secondary flex-1"
                >
                  Repeat Previous
                </button>
              </div>

              {/* Next Workout Preview */}
              {recommendation && (recommendation as any).next_workout && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">What's Next</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Tomorrow's Workout</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize mt-1">
                          💪 {(recommendation as any).next_workout.type}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {(recommendation as any).next_workout.rest_days} day rest
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      {(recommendation as any).next_workout.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card mb-6 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-gray-700">No recommendation yet. Log your first workout to get started.</p>
          </div>
        )}

        {/* Collapsible Workout History */}
        <div className="card mb-6">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            <span>📋 Recent Workouts</span>
            <span className={`text-lg transition-transform ${historyOpen ? 'rotate-90' : ''}`}>→</span>
          </button>
          {historyOpen && (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {workoutHistory.length > 0 ? (
                workoutHistory.map((w) => (
                  <div key={w.id} className="border-t border-gray-200 pt-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{w.workout_type}</p>
                        <p className="text-gray-600 text-xs">{new Date(w.session_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        {w.duration_minutes && <p className="text-gray-700">{w.duration_minutes} min</p>}
                        {w.next_action && <p className="text-xs text-blue-600 mt-1">{w.next_action}</p>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No workouts logged yet</p>
              )}
            </div>
          )}
        </div>

        {/* Footer - Profile, Settings, Sign Out */}
        <div className="mt-auto pt-6 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {(profile?.first_name || user?.name || user?.email || 'R')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{profile?.first_name || user?.name || 'Runner'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              ⚙️
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
            >
              👋
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Log Workout */}
      <div className="w-1/3 border-l border-gray-200 p-6 flex flex-col h-screen overflow-y-auto bg-white sticky top-0">
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Workout</h2>

          {trainingStep === 'input' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Describe Your Workout</label>
              <textarea
                value={workoutNote}
                onChange={(e) => setWorkoutNote(e.target.value)}
                placeholder="E.g., 'I did 5-minute jog, 2-minute walk intervals for 35 minutes. Completed all 5 rounds. Felt good.'"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base h-20 mb-3"
              />

              <div className="flex gap-2 mb-4">
                <button
                  onClick={toggleVoiceInput}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300'
                  }`}
                  title="Click to record voice note"
                >
                  {isListening ? '🎤 Listening...' : '🎤 Voice Type It'}
                </button>
                <button
                  onClick={handleExtractWorkout}
                  disabled={!workoutNote.trim() || trainingLoading}
                  className="flex-1 button-primary disabled:opacity-50"
                >
                  {trainingLoading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>
          )}

          {trainingStep === 'questionnaire' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick follow-up questions</h3>
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
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max={q.max || 10}
                          value={questionnaireAnswers[q.id] || q.default || 0}
                          onChange={(e) =>
                            setQuestionnaireAnswers({ ...questionnaireAnswers, [q.id]: e.target.value })
                          }
                          className="flex-1"
                        />
                        <span className="text-sm font-semibold text-gray-900 w-12">
                          {questionnaireAnswers[q.id] || q.default || 0}
                        </span>
                      </div>
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
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitQuestionnaire}
                  disabled={trainingLoading}
                  className="button-primary flex-1 disabled:opacity-50"
                >
                  {trainingLoading ? 'Analyzing...' : '📊 Analyze'}
                </button>
                <button onClick={() => setTrainingStep('input')} className="button-secondary flex-1">
                  Back
                </button>
              </div>
            </div>
          )}

          {trainingStep === 'analysis' && analysisText && (
            <div>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Workout Analysis</h3>
                <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed mb-6">
                  {analysisText}
                </div>
                <div className="bg-white p-4 rounded border border-purple-200 mb-6">
                  <p className="text-xs text-gray-600 mb-2">🔍 Claude is analyzing your patterns across all workouts...</p>
                  <p className="text-xs text-gray-600">This helps future recommendations adapt to YOUR personal thresholds.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTrainingStep('questionnaire')}
                  className="button-secondary flex-1"
                  title="Go back to ask more questions"
                >
                  ❓ More Questions?
                </button>
                <button
                  onClick={() => setTrainingStep('accept-tweak')}
                  className="button-primary flex-1"
                  title="See your personalized recommendation"
                >
                  → Ready for Recommendation
                </button>
              </div>
            </div>
          )}

          {trainingStep === 'accept-tweak' && trainingRecommendation && !isTweaking && (
            <div>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">✨ Recommended Workout</h3>

                <div className="space-y-4 mb-6">
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm font-semibold text-gray-600">Next Action</p>
                    <p className="text-xl font-bold text-green-600 mt-2">{trainingRecommendation.next_action}</p>
                  </div>

                  {trainingRecommendation.workout && (
                    <div className="p-3 bg-white rounded border border-green-200">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Workout Details</p>
                      <p className="text-sm font-medium text-gray-900 mb-2">{trainingRecommendation.workout.name}</p>
                      {trainingRecommendation.workout.exercises && (
                        <ul className="text-sm text-gray-700 space-y-1">
                          {trainingRecommendation.workout.exercises.map((ex: any, i: number) => (
                            <li key={i}>
                              • {ex.name}: {ex.sets} × {ex.reps}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm font-semibold text-gray-600">Reasoning</p>
                    <p className="text-sm text-gray-700 mt-2">{trainingRecommendation.reasoning}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Save to database
                      saveRecommendationToDb(trainingRecommendation);
                      // Save recommendation as next workout (flexible for all types)
                      setRecommendation({
                        id: 'accepted',
                        user_id: user?.id || '',
                        triggered_by_workout_id: null,
                        recommended_date: new Date().toISOString().split('T')[0],
                        workout_type: trainingRecommendation.next_action,
                        workout_details: trainingRecommendation.workout || null,
                        run_prescription: trainingRecommendation.workout?.jog_minutes ? trainingRecommendation.workout : null,
                        rationale: trainingRecommendation.reasoning,
                        readiness_score: 0,
                        risk_level: 'green',
                        user_acknowledged: true,
                        user_overridden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        next_workout: trainingRecommendation.next_action,
                        rest_status: 'ready',
                      } as any);
                      resetTrainingForm();
                    }}
                    className="button-primary flex-1"
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={() => setIsTweaking(true)}
                    className="button-secondary flex-1"
                  >
                    ✏️ Refine
                  </button>
                </div>
              </div>
            </div>
          )}

          {trainingStep === 'accept-tweak' && isTweaking && (
            <div>
              <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Refine Your Recommendation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tell me more about what you'd like to adjust. I'll refine the recommendation based on your feedback.
                </p>

                <textarea
                  value={tweakingNote}
                  onChange={(e) => setTweakingNote(e.target.value)}
                  placeholder="E.g., 'I prefer running over strength work', or 'Can we make it easier?' or 'I want to progress harder'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base h-24 mb-4"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (tweakingNote.trim()) {
                        // Save to database with user feedback
                        saveRecommendationToDb(trainingRecommendation, tweakingNote);
                        // Accept with the note (flexible for all workout types)
                        setRecommendation({
                          id: 'tweaked',
                          user_id: user?.id || '',
                          triggered_by_workout_id: null,
                          recommended_date: new Date().toISOString().split('T')[0],
                          workout_type: trainingRecommendation.next_action,
                          workout_details: trainingRecommendation.workout || null,
                          run_prescription: trainingRecommendation.workout?.jog_minutes ? trainingRecommendation.workout : null,
                          rationale: `${trainingRecommendation.reasoning}\n\nUser refinement: ${tweakingNote}`,
                          readiness_score: 0,
                          risk_level: 'green',
                          user_acknowledged: true,
                          user_overridden: true,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          next_workout: trainingRecommendation.next_action,
                          rest_status: 'ready',
                        } as any);
                        resetTrainingForm();
                      }
                    }}
                    className="button-primary flex-1"
                    disabled={!tweakingNote.trim()}
                  >
                    ✅ Accept Refinement
                  </button>
                  <button
                    onClick={() => setIsTweaking(false)}
                    className="button-secondary flex-1"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {trainingStep === 'recommendation' && trainingRecommendation && (
            <div>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Summary</p>
                  <p className="text-gray-900">{trainingRecommendation.summary}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600">Recovery Status</p>
                  <p className="text-gray-900">{trainingRecommendation.readiness}</p>
                </div>

                <div className="p-3 bg-white rounded border border-blue-200">
                  <p className="text-sm font-semibold text-gray-600">Next Action</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">{trainingRecommendation.next_action}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600">Why</p>
                  <p className="text-gray-900">{trainingRecommendation.reasoning}</p>
                </div>

                {trainingRecommendation.watch_outs && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-semibold text-gray-600">Watch-outs</p>
                    <p className="text-sm text-gray-700 mt-2">{trainingRecommendation.watch_outs}</p>
                  </div>
                )}

                {trainingRecommendation.workout && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-semibold text-gray-600 mb-2">Suggested Workout</p>
                    <p className="text-sm font-medium text-gray-900 mb-2">{trainingRecommendation.workout.name}</p>
                    {trainingRecommendation.workout.exercises && (
                      <ul className="text-sm text-gray-700 space-y-1">
                        {trainingRecommendation.workout.exercises.map((ex: any, i: number) => (
                          <li key={i}>
                            • {ex.name}: {ex.sets} × {ex.reps}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <button onClick={resetTrainingForm} className="button-primary w-full">
                Log Another Workout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Details Modal */}
      {showRecommendationModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Recommendation Details</h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-600">Next Action</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{selectedRecommendation.next_action}</p>
              </div>

              {selectedRecommendation.workout_name && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Workout Name</p>
                  <p className="text-gray-900 mt-1">{selectedRecommendation.workout_name}</p>
                </div>
              )}

              {selectedRecommendation.exercises && selectedRecommendation.exercises.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">Exercises</p>
                  <ul className="space-y-2">
                    {selectedRecommendation.exercises.map((ex: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700">
                        • <span className="font-medium">{ex.name}</span>: {ex.sets} × {ex.reps}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecommendation.reasoning && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Reasoning</p>
                  <p className="text-gray-700 mt-1 text-sm">{selectedRecommendation.reasoning}</p>
                </div>
              )}

              {selectedRecommendation.watch_outs && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-gray-600">Watch-outs</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedRecommendation.watch_outs}</p>
                </div>
              )}

              {selectedRecommendation.user_feedback && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <p className="text-sm font-semibold text-gray-600">Your Refinement</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedRecommendation.user_feedback}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Created: {new Date(selectedRecommendation.created_at).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={() => setShowRecommendationModal(false)}
              className="button-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Repeat Previous Modal */}
        {showRepeatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Repeat This Workout</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add a note about why you're repeating this workout. The app will learn from this and suggest workouts accordingly.
              </p>

              <textarea
                value={repeatNote}
                onChange={(e) => setRepeatNote(e.target.value)}
                placeholder="E.g., 'Felt great yesterday, want to maintain momentum' or just hit the mic button below..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-sm"
                rows={4}
              />

              <p className="text-xs text-gray-500 mb-4 text-center">
                🎤 Voice note feature coming soon
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRepeatModal(false);
                    setRepeatNote('');
                  }}
                  className="button-secondary flex-1"
                  disabled={repeatLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRepeatPrevious}
                  disabled={repeatLoading || !repeatNote.trim()}
                  className="button-primary flex-1 disabled:opacity-50"
                >
                  {repeatLoading ? 'Saving...' : 'Save & Log'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
