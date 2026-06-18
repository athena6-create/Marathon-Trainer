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
      const { error } = await supabase
        .from('athlete_profile')
        .update(profile)
        .eq('id', profile.id);

      if (error) throw error;
      alert('Profile saved successfully!');
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
