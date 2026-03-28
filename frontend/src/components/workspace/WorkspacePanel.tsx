'use client';

import React, { useMemo } from 'react';
import { PhaseIndicator } from './PhaseIndicator';
import { CaseFile } from './CaseFile';
import { RateTimeline } from '@/components/visualizers/RateTimeline';
import { FractionVisualizer } from '@/components/visualizers/FractionVisualizer';
import { CaseTemplate } from '@/lib/api';

type Phase = 'warmup' | 'plan' | 'solve' | 'explain';

interface WorkspacePanelProps {
  isVisible: boolean;
  currentPhase: Phase;
  completedPhases?: ('plan' | 'solve' | 'explain')[];
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

/**
 * Renders the appropriate visual component based on the case template's visual_component field.
 * Returns null if no visual component is specified.
 */
function VisualComponent({ type }: { type?: 'rate_timeline' | 'fractions' | null }) {
  if (!type) return null;

  switch (type) {
    case 'rate_timeline':
      return (
        <div className="mb-4">
          <RateTimeline mode="single" />
        </div>
      );
    case 'fractions':
      return (
        <div className="mb-4">
          <FractionVisualizer mode="circle" />
        </div>
      );
    default:
      return null;
  }
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  isVisible,
  currentPhase,
  completedPhases = [],
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
  const visualComponentType = useMemo(
    () => caseData?.visual_component ?? null,
    [caseData?.visual_component]
  );

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-lg shadow-lg transition-all duration-300 ${
        !isVisible ? 'opacity-30 pointer-events-none' : ''
      }`}
    >
      {/* Scrollable content area: visual component (if any) + case file */}
      <div className="flex-1 overflow-y-auto">
        {caseData ? (
          <>
            {/* Visual component loads above the case file */}
            <VisualComponent type={visualComponentType} />

            {/* Case File - always present */}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 min-h-[300px]">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-base font-medium text-slate-900 mb-1">
                Waiting for case...
              </h2>
              <p className="text-slate-500 text-sm">
                Claude will present your case shortly
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Phase Indicator at Bottom — always visible, not scrolled */}
      <PhaseIndicator
        currentPhase={
          currentPhase === 'warmup'
            ? null
            : (currentPhase as 'plan' | 'solve' | 'explain' | null)
        }
        completedPhases={completedPhases}
      />
    </div>
  );
};
