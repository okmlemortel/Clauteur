'use client';

import React from 'react';

interface VoiceButtonProps {
  isRecording: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isRecording,
  onToggle,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`p-3 rounded-full transition-all ${
          isRecording
            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
          <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.539 5.585 5.75 5.585a5.953 5.953 0 002.5-.576.75.75 0 10-.664-1.356A4.492 4.492 0 0110 14.643v-5z" />
        </svg>
      </button>

      {isRecording && (
        <span className="text-xs text-red-600 font-medium animate-pulse">
          Listening...
        </span>
      )}
    </div>
  );
};
