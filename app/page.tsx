'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

        console.log('Generating recommendation...');
        const recResponse = await fetch('/api/recommendation/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id }),
        });
        const recData = await recResponse.json();

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
          } as any);
          setReadinessScore(recData.oura_readiness);
        }

        console.log('Fetching Oura status...');
        const ouraResponse = await fetch('/api/oura/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id }),
        });
        console.log('Oura status response:', ouraResponse.status);
        const ouraData = await ouraResponse.json();
        console.log('Oura data:', ouraData);
        setOuraStatus(ouraData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
    <div className="flex gap-6" style={{ minHeight: '100vh' }}>
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col sticky top-0 h-screen">
        {/* Profile Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {(profile?.first_name || user?.name || user?.email || 'R')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.first_name || user?.name || 'Runner'}</p>
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="space-y-2 mb-6 flex-1">
          <Link
            href="/log-workout"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-colors font-medium text-sm"
          >
            <span>📝</span>
            Log Workout
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-colors font-medium text-sm"
          >
            <span>📊</span>
            Workout History
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-6"></div>

        {/* Secondary Actions */}
        <div className="space-y-2 mb-6">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-colors font-medium text-sm"
          >
            <span>⚙️</span>
            Settings
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors font-medium text-sm text-left"
          >
            <span>👋</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 max-w-4xl">
        {/* Oura Insights Card */}
        {ouraStatus?.connected && ouraStatus?.todaySnapshot ? (
          <div className="card mb-6 border-l-4 border-blue-400">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Oura Insights</h2>
              {ouraStatus.lastSyncedAt && (
                <span className="text-xs text-gray-500">
                  {getRelativeTime(ouraStatus.lastSyncedAt)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Readiness Score */}
              {ouraStatus.todaySnapshot.readiness_score && (
                <div className={`bg-gradient-to-br ${getScoreColor(ouraStatus.todaySnapshot.readiness_score)} p-4 rounded-lg`}>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Readiness</p>
                  <p className="text-3xl font-bold text-gray-900">{ouraStatus.todaySnapshot.readiness_score}</p>
                  {ouraStatus.baselines.readinessScore && (
                    <p className="text-xs text-gray-600 mt-1">
                      Avg: {ouraStatus.baselines.readinessScore}
                    </p>
                  )}
                </div>
              )}

              {/* Sleep Score */}
              {ouraStatus.todaySnapshot.sleep_score && (
                <div className={`bg-gradient-to-br ${getScoreColor(ouraStatus.todaySnapshot.sleep_score)} p-4 rounded-lg`}>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Sleep</p>
                  <p className="text-3xl font-bold text-gray-900">{ouraStatus.todaySnapshot.sleep_score}</p>
                  {ouraStatus.baselines.sleepScore && (
                    <p className="text-xs text-gray-600 mt-1">
                      Avg: {ouraStatus.baselines.sleepScore}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : ouraStatus?.connected === false ? (
          <div className="card mb-6 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-gray-700 mb-2">Connect your Oura Ring for real-time sleep, readiness, and heart rate insights.</p>
            <Link href="/profile" className="text-blue-600 font-semibold text-sm hover:underline">
              Go to Settings →
            </Link>
          </div>
        ) : null}

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
            <h2 className="text-lg font-semibold mb-3 text-gray-900">Next Recommended Workout</h2>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                {recommendation.workout_type.toUpperCase()}
              </span>
            </div>

            {recommendation.run_prescription && (
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p className="font-semibold text-gray-900 mb-3">Prescription:</p>
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
            </div>
          </div>
        ) : (
          <div className="card mb-6 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-gray-700">No recommendation yet. Log your first workout to get started.</p>
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
    </div>
  );
}
