'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'1month' | '3months' | 'all'>('3months');

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
        setWorkouts(data || []);
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
            <p className="text-gray-700 mb-3">No workouts yet. Start tracking!</p>
            <Link href="/" className="button-primary">
              Log a Workout
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Header: Date and Delete Button */}
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-semibold text-gray-600">
                    {(() => {
                      const [year, month, day] = workout.workout_date.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      });
                    })()}
                  </p>
                  <button
                    onClick={() => handleDeleteWorkout(workout.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-3 gap-4 mb-2 text-xs font-semibold text-gray-600">
                  <div>Workout</div>
                  <div>Type</div>
                  <div className="text-right">Duration</div>
                </div>

                {/* Workout Data */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="col-span-1">
                    <p className="text-lg font-semibold text-gray-900">
                      {workout.summary}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded capitalize inline-block">
                      other
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    {workout.duration_minutes && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded inline-block">
                        {workout.duration_minutes} min
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes if present */}
                {workout.raw_note && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Notes:</p>
                    <p className="text-sm text-gray-700 italic">"{workout.raw_note}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
