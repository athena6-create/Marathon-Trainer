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

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Dashboard loading...');
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          window.location.href = '/auth/login';
          return;
        }
        console.log('Auth user loaded:', authUser.id);

        // Use auth user directly (no need to query users table)
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email || 'Runner',
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Get athlete profile
        const { data: profileData } = await supabase
          .from('athlete_profile')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Generate recommendation from agile progression
        console.log('Generating recommendation...');
        const recResponse = await fetch('/api/recommendation/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id }),
        });
        const recData = await recResponse.json();

        if (recData.run_prescription) {
          // Transform into recommendation format for display
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

        // Get Oura status
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'green':
        return 'readiness-green';
      case 'yellow':
        return 'readiness-yellow';
      case 'red':
        return 'readiness-red';
      default:
        return 'bg-gray-50';
    }
  };

  const getRunLevelString = () => {
    if (!profile) return 'N/A';
    return `${profile.current_run_level_jog_minutes}:${String(profile.current_run_level_jog_seconds).padStart(2, '0')} jog / ${profile.current_run_level_walk_minutes}:${String(profile.current_run_level_walk_seconds).padStart(2, '0')} walk x${profile.current_run_level_reps_min}${profile.current_run_level_reps_max ? `-${profile.current_run_level_reps_max}` : ''} @ ${profile.preferred_jog_speed_mph || 4.6} mph`;
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
    <div className="container-main">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Running Coach</h1>
        <p className="text-gray-600">Welcome, {user?.name || user?.email || 'Runner'}</p>
      </div>

      {/* Oura Insights Card */}
      {ouraStatus?.connected && ouraStatus?.todaySnapshot ? (
        <div className="card mb-6 border-l-4 border-blue-400">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📱 Oura Insights</h2>
            <span className="text-xs text-gray-500">
              {ouraStatus.lastSyncedAt ? `Synced: ${new Date(ouraStatus.lastSyncedAt).toLocaleDateString()}` : 'Syncing...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sleep Score */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 mb-1">Sleep Score</p>
              <p className="text-3xl font-bold text-blue-900">{ouraStatus.todaySnapshot.sleep_score || 'N/A'}</p>
              {ouraStatus.baselines.sleepScore && (
                <p className="text-xs text-gray-600 mt-1">
                  Avg: {ouraStatus.baselines.sleepScore}
                </p>
              )}
            </div>

            {/* Readiness Score */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 mb-1">Readiness Score</p>
              <p className="text-3xl font-bold text-green-900">{ouraStatus.todaySnapshot.readiness_score || 'N/A'}</p>
              {ouraStatus.baselines.readinessScore && (
                <p className="text-xs text-gray-600 mt-1">
                  Avg: {ouraStatus.baselines.readinessScore}
                </p>
              )}
            </div>
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
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Current Run Level</h2>
        <p className="text-lg font-mono text-blue-600">{getRunLevelString()}</p>
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
              <p className="font-semibold text-gray-900 mb-2">Prescription:</p>
              <p className="font-mono text-gray-700">
                {recommendation.run_prescription.jog_minutes}:{String(recommendation.run_prescription.jog_seconds).padStart(2, '0')} jog / {recommendation.run_prescription.walk_minutes}:{String(recommendation.run_prescription.walk_seconds).padStart(2, '0')} walk x{recommendation.run_prescription.reps_min}-{recommendation.run_prescription.reps_max} @ {recommendation.run_prescription.speed_mph} mph
              </p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Rationale:</p>
            <p className="text-gray-700 text-sm">{recommendation.rationale}</p>
          </div>

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
                // For now, just log to console; could open a modal or navigate to edit page
                alert('Override feature coming soon! You can modify: interval duration, reps, speed, intensity.');
              }}
              className="button-secondary flex-1"
            >
              Tweak/Override
            </button>
            <Link href="/log-workout" className="button-secondary">
              Log Workout
            </Link>
          </div>
        </div>
      ) : (
        <div className="card mb-6 bg-yellow-50 border-l-4 border-yellow-400">
          <p className="text-gray-700">No recommendation yet. Log your first workout to get started.</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link href="/log-workout" className="card text-center hover:shadow-lg transition-shadow">
          <p className="text-2xl mb-2">📝</p>
          <p className="font-semibold text-gray-900">Log Workout</p>
          <p className="text-xs text-gray-600 mt-1">Record voice or text</p>
        </Link>

        <Link href="/history" className="card text-center hover:shadow-lg transition-shadow">
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold text-gray-900">Workout History</p>
          <p className="text-xs text-gray-600 mt-1">View past workouts</p>
        </Link>

        <Link href="/profile" className="card text-center hover:shadow-lg transition-shadow">
          <p className="text-2xl mb-2">⚙️</p>
          <p className="font-semibold text-gray-900">Settings</p>
          <p className="text-xs text-gray-600 mt-1">Update preferences</p>
        </Link>

        <button
          onClick={() => supabase.auth.signOut()}
          className="card text-center hover:shadow-lg transition-shadow hover:bg-red-50 cursor-pointer"
        >
          <p className="text-2xl mb-2">👋</p>
          <p className="font-semibold text-gray-900">Sign Out</p>
          <p className="text-xs text-gray-600 mt-1">Goodbye!</p>
        </button>
      </div>
    </div>
  );
}
