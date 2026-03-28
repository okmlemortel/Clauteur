'use client';

import React from 'react';
import { PhaseIndicator } from './PhaseIndicator';
import { CaseFile } from './CaseFile';
import { CaseTemplate } from '@/lib/api';

type Phase = 'warmup' | 'plan' | 'solve' | 'explain';

interface WorkspacePanelProps {
  isVisible: boolean;
  currentPhase: Phase;
  caseData?: CaseTemplate;
  onFieldChange: (field: 'given' | 'problem' | 'solution' | 'explanation', content: string) => void;
  onFieldSubmit: (field: string, content: string) => void;
  fieldFeedback?: string;
  isVoiceActive?: boolean;
  voiceTranscript?: string;
  voiceTargetField?: string;
  caseFileContent?: {
    given: string;
    problem: string;
    solution: string;
    explanation: string;
  };
  explainLanguage?: 'en' | 'fr';
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  isVisible,
  currentPhase,
  caseData,
  onFieldChange,
  onFieldSubmit,
  fieldFeedback,
  isVoiceActive = false,
  voiceTranscript = '',
  voiceTargetField,
  caseFileContent = {
    given: '',
    problem: '',
    solution: '',
    explanation: '',
  },
  explainLanguage = 'en',
}) => {
  return (
    <div
      className={`flex flex-col h-full bg-white rounded-2xl shadow-lg transition-all duration-300 ${
        !isVisible ? 'opacity-30 pointer-events-none' : ''
      }`}
    >
      {/* Case File - main workspace */}
      {caseData ? (
        <CaseFile
          caseTitle={caseData.title}
          narrative={caseData.narrative}
          planPrompt={caseData.plan_prompt}
          currentPhase={currentPhase}
          explainLanguage={explainLanguage}
          onFieldChange={onFieldChange}
          onFieldSubmit={onFieldSubmit}
          fieldFeedback={fieldFeedback}
          isVoiceActive={isVoiceActive}
          voiceTranscript={voiceTranscript}
          voiceTargetField={voiceTargetField}
          caseFileContent={caseFileContent}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Waiting for case...
            </h2>
            <p className="text-slate-600 text-sm">
              Claude will present your case shortly
            </p>
          </div>
        </div>
      )}

      {/* Phase Indicator at Bottom */}
      <PhaseIndicator
        currentPhase={
          currentPhase === 'warmup'
            ? null
            : (currentPhase as 'plan' | 'solve' | 'explain' | null)
        }
      />
    </div>
  );
};
