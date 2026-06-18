'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LogWorkout() {
  const [mode, setMode] = useState<'recording' | 'transcript' | 'extracted' | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');

      // TODO: Call OpenAI Whisper API
      // For now, show a placeholder
      setTranscript('Transcription would appear here...');
      setMode('transcript');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setLoading(false);
    }
  };

  const extractWorkoutData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/extract-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) throw new Error('Extraction failed');
      const data = await response.json();
      setExtracted(data);
      setMode('extracted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const saveWorkout = async () => {
    if (!extracted) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/save-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted, rawNote: transcript, userId: user.id }),
      });

      if (!response.ok) throw new Error('Save failed');
      alert('Workout saved! Redirecting...');
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Log Workout</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Mode Selection */}
        {mode === null && (
          <div className="space-y-4">
            <p className="text-gray-700 mb-6">How would you like to log your workout?</p>

            <button
              onClick={() => setMode('recording')}
              className="w-full card text-left hover:shadow-lg transition-shadow border-2 border-blue-200"
            >
              <p className="text-2xl mb-2">🎤</p>
              <p className="font-semibold text-gray-900">Record Voice Note</p>
              <p className="text-sm text-gray-600">Describe your workout out loud</p>
            </button>

            <button
              onClick={() => setMode('transcript')}
              className="w-full card text-left hover:shadow-lg transition-shadow border-2 border-gray-200"
            >
              <p className="text-2xl mb-2">✍️</p>
              <p className="font-semibold text-gray-900">Type Text</p>
              <p className="text-sm text-gray-600">Write your workout details</p>
            </button>
          </div>
        )}

        {/* Recording Mode */}
        {mode === 'recording' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              {isRecording ? (
                <>
                  <div className="animate-pulse text-4xl mb-4">🔴</div>
                  <p className="text-gray-700 font-semibold mb-4">Recording...</p>
                  <button
                    onClick={stopRecording}
                    className="button-primary"
                  >
                    Stop Recording
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">🎤</div>
                  <p className="text-gray-700 mb-4">Click to start recording your voice note</p>
                  <button
                    onClick={startRecording}
                    disabled={loading}
                    className="button-primary disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Start Recording'}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setMode(null)}
              className="button-secondary w-full"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Transcript Review Mode */}
        {mode === 'transcript' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Workout Note
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Describe your workout: what you did, how you felt, HR data, pain, sleep, period, etc."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Example: "Did 5-minute jog, 2-minute walk x5 at 4.6 mph. HR stayed in the 150s, hit 170 briefly in the last rep. Felt great, slept well yesterday."
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={extractWorkoutData}
                disabled={!transcript || loading}
                className="button-primary disabled:opacity-50"
              >
                {loading ? 'Extracting...' : 'Extract Data'}
              </button>
              <button
                onClick={() => setMode(null)}
                className="button-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Extracted Data Review Mode */}
        {mode === 'extracted' && extracted && (
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-600 p-4">
              <p className="font-semibold text-gray-900">Data extracted successfully</p>
              <p className="text-sm text-gray-600">Review and edit before saving</p>
            </div>

            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(extracted, null, 2)}
            </pre>

            <div className="flex gap-2">
              <button
                onClick={saveWorkout}
                disabled={loading}
                className="button-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Workout'}
              </button>
              <button
                onClick={() => setMode('transcript')}
                className="button-secondary"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
