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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          window.location.href = '/auth/login';
          return;
        }

        // Get user profile
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser(userData);
        }

        // Get athlete profile
        const { data: profileData } = await supabase
          .from('athlete_profile')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Get today's recommendation
        const today = new Date().toISOString().split('T')[0];
        const { data: recData } = await supabase
          .from('recommendations')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('recommended_date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recData) {
          setRecommendation(recData);
          setReadinessScore(recData.readiness_score);
        }
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

      {/* Readiness Score Card */}
      <div className={`card mb-6 ${getRiskLevelColor(recommendation?.risk_level || 'green')}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold mb-2">Today's Readiness</p>
            <div className="text-4xl font-bold mb-2">{readinessScore}/100</div>
            <p className="text-sm">
              {readinessScore >= 80 && '🟢 Green — Progress allowed'}
              {readinessScore >= 60 && readinessScore < 80 && '🟡 Normal — Repeat current'}
              {readinessScore >= 40 && readinessScore < 60 && '🟡 Yellow — Downgrade'}
              {readinessScore < 40 && '🔴 Red — Rest/walk only'}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Current Run Level */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Current Run Level</h2>
        <p className="text-lg font-mono text-blue-600">{getRunLevelString()}</p>
      </div>

      {/* Recommended Workout */}
      {recommendation ? (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Today's Recommended Workout</h2>
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
            <button className="button-primary">Acknowledge</button>
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
