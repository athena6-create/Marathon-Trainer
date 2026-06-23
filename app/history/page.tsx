'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const getCategoryFromActivity = (activity: string): 'run' | 'strength' | 'other' => {
  const lower = activity.toLowerCase();
  if (lower.includes('run') || lower.includes('biking') || lower.includes('bike') || lower.includes('cycling')) {
    return 'run';
  } else if (lower.includes('strength') || lower.includes('weight') || lower.includes('resistance')) {
    return 'strength';
  }
  return 'other';
};

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'1month' | '3months' | 'all'>('3months');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteWorkout = async (workoutId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this workout? This change cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      // Remove from UI
      setWorkouts(workouts.filter((w) => w.id !== workoutId));
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout');
    }
  };

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth/login';
          return;
        }

        // Calculate date range
        let query = supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id);

        if (dateRange !== 'all') {
          const daysBack = dateRange === '1month' ? 30 : 90;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysBack);
          query = query.gte('workout_date', startDate.toISOString().split('T')[0]);
        }

        const { data } = await query.order('workout_date', { ascending: false });

        if (data) {
          // Deduplicate by (workout_date, workout_type, summary) to remove accidental duplicates
          const seen = new Set();
          const unique = data.filter((workout) => {
            const key = `${workout.workout_date}-${workout.workout_type}-${workout.summary || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setWorkouts(unique);
        }
      } catch (error) {
        console.error('Error loading workouts:', error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadWorkouts();
  }, [dateRange]);

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
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Workout History</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('1month')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                dateRange === '1month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              1mo
            </button>
            <button
              onClick={() => setDateRange('3months')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                dateRange === '3months'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              3mo
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                dateRange === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {workouts.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-gray-700 mb-3">
              No workouts logged yet. Start tracking your training!
            </p>
            <Link href="/log-workout" className="button-primary">
              Log Your First Workout
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => {
              const isPending = !workout.completed && workout.summary?.includes('Pending');
              return (
              <div key={workout.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                isPending
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-200'
              }`}>
                {/* Header with date and top-right actions */}
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-semibold text-gray-600">
                    {new Date(workout.workout_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      workout.completed
                        ? 'bg-green-100 text-green-800'
                        : isPending
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {workout.completed ? '✓ Completed' : isPending ? '⏳ Pending' : 'Planned'}
                    </span>
                    <button
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-2 gap-4 mb-2 text-xs font-semibold text-gray-600">
                  <div>Workout</div>
                  <div className="flex gap-4">
                    <div>Type</div>
                    <div>Duration</div>
                  </div>
                </div>

                {/* Data row */}
                <div className="grid grid-cols-2 gap-4 items-center mb-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {workout.summary || workout.workout_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded capitalize inline-block">
                      {getCategoryFromActivity(workout.summary || '')}
                    </span>
                    {workout.duration_minutes && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded inline-block">
                        {workout.duration_minutes} min
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {workout.distance_miles && (
                    <div>
                      <p className="text-gray-600">Distance</p>
                      <p className="font-semibold text-gray-900">{workout.distance_miles.toFixed(2)} mi</p>
                    </div>
                  )}
                  {workout.perceived_effort && (
                    <div>
                      <p className="text-gray-600">Effort</p>
                      <p className="font-semibold text-gray-900">{workout.perceived_effort}/10</p>
                    </div>
                  )}
                  {workout.readiness_before && (
                    <div>
                      <p className="text-gray-600">Readiness</p>
                      <p className="font-semibold text-gray-900">{workout.readiness_before}/100</p>
                    </div>
                  )}
                </div>

                {workout.raw_note && !workout.raw_note.includes("Pending") && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Notes:</p>
                    <p className="text-sm text-gray-700 italic">"{workout.raw_note}"</p>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
