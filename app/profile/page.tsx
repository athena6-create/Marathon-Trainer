'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { AthleteProfile } from '@/lib/types';

export default function Profile() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedData, setSyncedData] = useState<any>(null);
  const searchParams = useSearchParams();

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
            first_name: user.user_metadata?.name || '',
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

      // Ensure the user exists in the users table (using service role)
      await fetch('/api/ensure-user', { method: 'POST' });

      // Exclude Oura fields from the update (they're managed by the sync endpoint)
      const {
        oura_access_token,
        oura_refresh_token,
        oura_user_id,
        oura_synced_at,
        ...profileDataToSave
      } = profile;

      if (profile.id) {
        // Update existing profile
        const { error } = await supabase
          .from('athlete_profile')
          .update(profileDataToSave)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        // Create new profile (omit id so database auto-generates UUID)
        // RLS policy will validate that user_id matches the authenticated user
        const { id, ...profileData } = profileDataToSave;
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

  const handleConnectOura = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    window.location.href = `/api/oura/auth?userId=${user.id}`;
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

  const handleSyncOura = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/oura/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSyncedData(data);
      // Reload profile to show updated synced_at
      if (profile) {
        setProfile({
          ...profile,
          oura_synced_at: new Date().toISOString(),
        });
      }
      alert(`Synced ${data.synced_days} days of Oura data!`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync Oura data');
    } finally {
      setSyncing(false);
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
                First Name
              </label>
              <input
                type="text"
                value={profile.first_name || ''}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Your name"
              />
            </div>

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

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Oura Ring Integration</h3>

              {searchParams.get('oura') === 'connected' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✓ Successfully connected to Oura Ring!
                </div>
              )}

              {searchParams.get('oura') === 'error' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  ✗ Failed to connect Oura Ring. Please try again.
                </div>
              )}

              {profile?.oura_access_token ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-green-700">✓ Connected to Oura Ring</span>
                    {profile.oura_synced_at && (
                      <span className="text-xs text-gray-600">
                        {getRelativeTime(profile.oura_synced_at)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSyncOura}
                    disabled={syncing}
                    className="button-primary disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>

                  {syncedData && syncedData.synced_days > 0 && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200 text-sm">
                      <p className="text-gray-700 mb-2">
                        <strong>Last synced:</strong> {syncedData.synced_days} days
                      </p>
                      {syncedData.snapshots && syncedData.snapshots.length > 0 && (
                        <div className="space-y-1 text-xs text-gray-600">
                          <p>Latest data:</p>
                          <p>• Sleep Score: {syncedData.snapshots[syncedData.snapshots.length - 1]?.sleep_score || 'N/A'}</p>
                          <p>• Readiness: {syncedData.snapshots[syncedData.snapshots.length - 1]?.readiness_score || 'N/A'}</p>
                          <p>• HRV: {syncedData.snapshots[syncedData.snapshots.length - 1]?.hrv || 'N/A'} ms</p>
                          <p>• Resting HR: {syncedData.snapshots[syncedData.snapshots.length - 1]?.resting_heart_rate || 'N/A'} bpm</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    Connect your Oura Ring to integrate sleep, readiness, and heart rate data into your training recommendations.
                  </p>
                  <button
                    onClick={handleConnectOura}
                    className="button-primary"
                  >
                    Connect Oura Ring
                  </button>
                </div>
              )}
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
