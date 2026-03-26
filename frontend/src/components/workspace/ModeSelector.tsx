'use client';

import React from 'react';

interface ModeSelectorProps {
  onSelect: (mode: 'devoir' | 'session' | 'explorer') => void;
  isLoading?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  onSelect,
  isLoading = false,
}) => {
  const modes = [
    {
      id: 'devoir',
      label: 'J&apos;ai un devoir',
      icon: '📚',
      description: 'Tu as une tâche spécifique à accomplir',
    },
    {
      id: 'session',
      label: 'Session du jour',
      icon: '🎓',
      description: 'Apprentissage guidé sur un sujet',
    },
    {
      id: 'explorer',
      label: 'Explorer',
      icon: '🧭',
      description: 'Explore un sujet qui t\'intéresse',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Comment veux-tu apprendre aujourd&apos;hui ?
        </h2>
        <p className="text-sm text-slate-600">
          Choisis un mode pour commencer
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id as 'devoir' | 'session' | 'explorer')}
            disabled={isLoading}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{mode.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{mode.label}</p>
                <p className="text-sm text-slate-600">{mode.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
