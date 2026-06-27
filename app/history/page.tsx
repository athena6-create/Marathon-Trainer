'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          window.location.href = '/auth/login';
          return;
        }

        setUser(authUser);

        const { data, error } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', authUser.id)
          .order('session_date', { ascending: false });

        if (error) throw error;
        setWorkouts(data || []);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const handleDelete = async (workoutId: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id);

      if (error) throw error;

      setWorkouts(workouts.filter((w) => w.id !== workoutId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout');
    } finally {
      setDeleting(false);
    }
  };

  const getWorkoutIcon = (type: string) => {
    const icons: Record<string, string> = {
      run: '🏃',
      walk: '🚶',
      strength: '💪',
      mobility: '🧘',
      'cross-training': '🚴',
      rest: '😴',
    };
    return icons[type] || '⚡';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="container-main">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Workout History</h1>

        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : workouts.length === 0 ? (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-gray-700">
              No workouts logged yet. Start by logging your first workout on the dashboard!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getWorkoutIcon(workout.workout_type)}</span>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {workout.workout_type} {workout.completed ? '✓' : '(incomplete)'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(workout.session_date)}
                        </p>
                      </div>
                    </div>
                    {workout.raw_note && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        "{workout.raw_note.substring(0, 100)}{workout.raw_note.length > 100 ? '...' : ''}"
                      </p>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    {workout.duration_minutes && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold text-gray-900">{workout.duration_minutes} min</p>
                      </div>
                    )}
                    {workout.distance_miles && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">Distance</p>
                        <p className="font-semibold text-gray-900">{workout.distance_miles} mi</p>
                      </div>
                    )}
                    {workout.next_action && (
                      <div className="mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {workout.next_action}
                      </div>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(workout.id)}
                      className="mt-3 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {(workout.mood || workout.knee_pain !== null || workout.fatigue !== null) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3 text-sm">
                    {workout.mood && (
                      <div>
                        <p className="text-gray-600">Mood</p>
                        <p className="font-medium text-gray-900">{workout.mood}</p>
                      </div>
                    )}
                    {workout.knee_pain !== null && (
                      <div>
                        <p className="text-gray-600">Knee Pain</p>
                        <p className={`font-medium ${workout.knee_pain > 3 ? 'text-red-600' : workout.knee_pain > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {workout.knee_pain}/10
                        </p>
                      </div>
                    )}
                    {workout.fatigue !== null && (
                      <div>
                        <p className="text-gray-600">Fatigue</p>
                        <p className={`font-medium ${workout.fatigue > 7 ? 'text-red-600' : workout.fatigue > 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {workout.fatigue}/10
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Workout?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this workout? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
