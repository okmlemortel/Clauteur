'use client';

import React from 'react';
import { PhaseIndicator } from './PhaseIndicator';

type Phase = 'concret' | 'visuel' | 'symbolique' | null;

interface WorkspacePanelProps {
  currentPhase: Phase;
  isVisible: boolean;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  currentPhase,
  isVisible,
}) => {
  const getPhaseContent = () => {
    switch (currentPhase) {
      case 'concret':
        return {
          title: 'Zone de manipulation',
          description: 'Interagis avec les éléments pour comprendre le concept',
          emoji: '✋',
        };
      case 'visuel':
        return {
          title: 'Zone de visualisation',
          description: 'Vois comment ça fonctionne visuellement',
          emoji: '👁️',
        };
      case 'symbolique':
        return {
          title: 'Zone d\'écriture',
          description: 'Explique avec tes propres mots',
          emoji: '✏️',
        };
      default:
        return {
          title: 'Espace de travail',
          description: 'Attends le mode à explorer',
          emoji: '⏳',
        };
    }
  };

  const content = getPhaseContent();

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-2xl shadow-lg transition-all duration-300 ${
        !isVisible ? 'opacity-30 pointer-events-none' : ''
      }`}
    >
      {/* Workspace Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">{content.emoji}</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {content.title}
          </h2>
          <p className="text-slate-600 text-sm">{content.description}</p>

          {/* Placeholder Content */}
          <div className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl border border-indigo-200">
            <p className="text-xs text-slate-600">
              Contenu interactif chargé ici en fonction de la phase
            </p>
          </div>
        </div>
      </div>

      {/* Phase Indicator at Bottom */}
      <PhaseIndicator currentPhase={currentPhase} />
    </div>
  );
};
