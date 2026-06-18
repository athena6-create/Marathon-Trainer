'use client';

import Link from 'next/link';

export default function WorkoutHistory() {
  return (
    <div className="container-main">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Workout History</h1>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-gray-700">
            Workout history will appear here once you log your first workout.
          </p>
        </div>

        <div className="mt-6">
          <Link href="/log-workout" className="button-primary">
            Log Your First Workout
          </Link>
        </div>
      </div>
    </div>
  );
}
