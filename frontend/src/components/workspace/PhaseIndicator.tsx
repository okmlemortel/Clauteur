'use client';

import React from 'react';

interface PhaseIndicatorProps {
  currentPhase: 'plan' | 'solve' | 'explain' | null;
  completedPhases?: ('plan' | 'solve' | 'explain')[];
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  completedPhases = [],
}) => {
  const phases: Array<{ id: 'plan' | 'solve' | 'explain'; label: string }> = [
    { id: 'plan', label: 'plan' },
    { id: 'solve', label: 'solve' },
    { id: 'explain', label: 'explain' },
  ];

  const TEAL = '#1D9E75';
  const GRAY = '#CBD5E1';

  const getDotState = (phaseId: 'plan' | 'solve' | 'explain') => {
    if (phaseId === currentPhase) {
      return 'active'; // Teal filled
    }
    if (completedPhases.includes(phaseId)) {
      return 'completed'; // Teal outlined with checkmark
    }
    return 'inactive'; // Gray outlined
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4 px-4 border-t border-slate-200 bg-slate-50">
      {phases.map((phase, idx) => (
        <React.Fragment key={phase.id}>
          <div className="flex flex-col items-center gap-1.5">
            {/* Dot */}
            <div className="relative">
              {getDotState(phase.id) === 'active' && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TEAL }}
                />
              )}
              {getDotState(phase.id) === 'completed' && (
                <div className="relative">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: 'transparent',
                      border: `2px solid ${TEAL}`,
                    }}
                  />
                  <svg
                    className="absolute inset-0 w-3 h-3 text-teal-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              {getDotState(phase.id) === 'inactive' && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: 'transparent',
                    border: `2px solid ${GRAY}`,
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span className="text-[11px] font-semibold uppercase text-slate-600 tracking-wide">
              {phase.label}
            </span>
          </div>

          {/* Connecting line */}
          {idx < phases.length - 1 && (
            <div
              className="h-px w-6 mb-4"
              style={{ backgroundColor: GRAY }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
