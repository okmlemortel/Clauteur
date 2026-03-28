'use client';

import React from 'react';

type Phase = 'plan' | 'solve' | 'explain' | null;

interface PhaseIndicatorProps {
  currentPhase: Phase;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ currentPhase }) => {
  const phases: Array<{ id: Phase; label: string }> = [
    { id: 'plan', label: 'plan' },
    { id: 'solve', label: 'solve' },
    { id: 'explain', label: 'explain' },
  ];

  // Teal color for active: #1D9E75
  const TEAL_ACTIVE = '#1D9E75';
  const SLATE_INACTIVE = '#cbd5e1';

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4 border-t border-slate-200 bg-slate-50">
      {/* Phase Indicator - NOT clickable, display only */}
      <div className="flex items-center gap-6">
        {phases.map((phase, idx) => (
          <React.Fragment key={phase.id}>
            <div className="flex flex-col items-center gap-2">
              {/* Dot - teal if active, slate if inactive */}
              <div
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  backgroundColor: phase.id === currentPhase ? TEAL_ACTIVE : SLATE_INACTIVE,
                  transform: phase.id === currentPhase ? 'scale(1.3)' : 'scale(1)',
                }}
              />
              {/* Label */}
              <span className="text-xs font-medium text-slate-600">
                {phase.label}
              </span>
            </div>

            {/* Divider between phases */}
            {idx < phases.length - 1 && (
              <div className="h-px w-8 bg-slate-300" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current phase name display */}
      {currentPhase && (
        <p className="text-xs font-semibold text-slate-700 mt-2">
          Currently in: <span style={{ color: TEAL_ACTIVE }}>{currentPhase}</span>
        </p>
      )}
    </div>
  );
};
