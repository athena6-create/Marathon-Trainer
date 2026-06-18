'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AthleteProfile } from '@/lib/types';

export default function Profile() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth/login';
          return;
        }

        const { data } = await supabase
          .from('athlete_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setProfile(data);
        } else {
          // Create empty profile for new user
          setProfile({
            id: '',
            user_id: user.id,
            current_run_level_jog_minutes: 5,
            current_run_level_jog_seconds: 0,
            current_run_level_walk_minutes: 2,
            current_run_level_walk_seconds: 0,
            current_run_level_reps_min: 5,
            current_run_level_reps_max: 6,
            preferred_jog_speed_mph: 4.6,
            preferred_walk_speed_mph: 3.0,
            hr_backoff_threshold: 170,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Ensure user exists in public users table
      const { error: userError } = await supabase
        .from('users')
        .upsert(
          { id: user.id, email: user.email, name: user.user_metadata?.name },
          { onConflict: 'id' }
        );
      if (userError) throw userError;

      if (profile.id) {
        // Update existing profile
        const { error } = await supabase
          .from('athlete_profile')
          .update(profile)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        // Create new profile (omit id so database auto-generates UUID)
        const { id, ...profileData } = profile;
        const { error } = await supabase
          .from('athlete_profile')
          .insert([{ ...profileData, user_id: user.id }]);
        if (error) throw error;
      }
      alert('Profile saved successfully!');
      window.location.href = '/';
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-main">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {profile ? (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Current Run Level</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jog (min)</label>
                  <input
                    type="number"
                    value={profile.current_run_level_jog_minutes || 0}
                    onChange={(e) => setProfile({ ...profile, current_run_level_jog_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jog (sec)</label>
                  <input
                    type="number"
                    value={profile.current_run_level_jog_seconds || 0}
                    onChange={(e) => setProfile({ ...profile, current_run_level_jog_seconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Walk (min)</label>
                  <input
                    type="number"
                    value={profile.current_run_level_walk_minutes || 0}
                    onChange={(e) => setProfile({ ...profile, current_run_level_walk_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Walk (sec)</label>
                  <input
                    type="number"
                    value={profile.current_run_level_walk_seconds || 0}
                    onChange={(e) => setProfile({ ...profile, current_run_level_walk_seconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reps (min)</label>
                  <input
                    type="number"
                    value={profile.current_run_level_reps_min || 0}
                    onChange={(e) => setProfile({ ...profile, current_run_level_reps_min: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reps (max)</label>
                  <input
                    type="number"
                    value={profile.current_run_level_reps_max || 0}
                    onChange={(e) => setProfile({ ...profile, current_run_level_reps_max: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Age
              </label>
              <input
                type="number"
                value={profile.age || ''}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Training Goals
              </label>
              <textarea
                value={profile.goals || ''}
                onChange={(e) => setProfile({ ...profile, goals: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Preferred Jog Speed (mph)
              </label>
              <input
                type="number"
                step="0.1"
                value={profile.preferred_jog_speed_mph || ''}
                onChange={(e) => setProfile({ ...profile, preferred_jog_speed_mph: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                HR Back-off Threshold (bpm)
              </label>
              <input
                type="number"
                value={profile.hr_backoff_threshold}
                onChange={(e) => setProfile({ ...profile, hr_backoff_threshold: parseInt(e.target.value) || 170 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Training Days Per Week
              </label>
              <input
                type="number"
                value={profile.training_days_per_week || ''}
                onChange={(e) => setProfile({ ...profile, training_days_per_week: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="button-primary disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/" className="button-secondary">
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-gray-700">No profile found. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
