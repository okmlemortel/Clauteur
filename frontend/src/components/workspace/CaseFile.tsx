'use client';

import React, { useEffect, useRef } from 'react';
import { editTracker } from '@/lib/editTracker';

interface CaseFileProps {
  caseTitle: string;
  narrative: string;
  planPrompt: string;
  currentPhase: 'warmup' | 'plan' | 'solve' | 'explain';
  explainLanguage: 'en' | 'fr';
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
}

interface FieldConfig {
  key: 'given' | 'problem' | 'solution' | 'explanation';
  label: string;
  borderColor: string;
  question: string;
  locked: boolean;
  readOnly: boolean;
}

export const CaseFile: React.FC<CaseFileProps> = ({
  caseTitle,
  narrative,
  planPrompt,
  currentPhase,
  explainLanguage,
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
}) => {
  const textareaRefs = useRef<{
    given: HTMLTextAreaElement | null;
    problem: HTMLTextAreaElement | null;
    solution: HTMLTextAreaElement | null;
    explanation: HTMLTextAreaElement | null;
  }>({
    given: null,
    problem: null,
    solution: null,
    explanation: null,
  });

  // Auto-grow textareas
  const autoGrowTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, 80) + 'px';
  };

  // Determine field locks based on phase
  const getFieldConfig = (): FieldConfig[] => {
    const baseFields: FieldConfig[] = [
      {
        key: 'given',
        label: 'GIVEN',
        borderColor: '#1D9E75',
        question: 'What do I know?',
        locked: currentPhase === 'solve' || currentPhase === 'explain',
        readOnly: currentPhase === 'solve' || currentPhase === 'explain',
      },
      {
        key: 'problem',
        label: 'PROBLEM',
        borderColor: '#7F77DD',
        question: 'What am I looking for?',
        locked: currentPhase === 'solve' || currentPhase === 'explain',
        readOnly: currentPhase === 'solve' || currentPhase === 'explain',
      },
      {
        key: 'solution',
        label: 'SOLUTION',
        borderColor: '#BA7517',
        question: 'How do I get there?',
        locked: currentPhase === 'plan' || currentPhase === 'warmup' || currentPhase === 'explain',
        readOnly: currentPhase === 'plan' || currentPhase === 'warmup' || currentPhase === 'explain',
      },
      {
        key: 'explanation',
        label: 'EXPLANATION',
        borderColor: '#D85A30',
        question: explainLanguage === 'en' ? 'Explain your answer' : 'Explique ta réponse',
        locked: currentPhase !== 'explain',
        readOnly: currentPhase !== 'explain',
      },
    ];
    return baseFields;
  };

  const fields = getFieldConfig();

  const handleFieldChange = (field: 'given' | 'problem' | 'solution' | 'explanation', value: string) => {
    const textarea = textareaRefs.current[field];
    if (textarea) {
      autoGrowTextarea(textarea);
      editTracker.trackKeystroke(field, value.length);
    }
    onFieldChange(field, value);
  };

  const handleFieldFocus = (field: 'given' | 'problem' | 'solution' | 'explanation') => {
    editTracker.trackFocus(field);
  };

  const handleFieldBlur = (field: 'given' | 'problem' | 'solution' | 'explanation') => {
    editTracker.trackBlur(field);
  };

  // Handle voice transcription appending
  useEffect(() => {
    if (isVoiceActive && voiceTranscript && voiceTargetField) {
      const field = voiceTargetField as 'given' | 'problem' | 'solution' | 'explanation';
      const currentContent = caseFileContent[field] || '';

      // Only append if the transcript is new (not already in content)
      if (!currentContent.includes(voiceTranscript.trim())) {
        const newContent = currentContent ? `${currentContent} ${voiceTranscript}` : voiceTranscript;
        handleFieldChange(field, newContent);
      }
    }
  }, [voiceTranscript, isVoiceActive, voiceTargetField]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg p-6 overflow-y-auto">
      {/* Case Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h2 className="text-base font-medium text-slate-900 mb-2">
          Case #{caseTitle}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {narrative}
        </p>
        {currentPhase === 'plan' && planPrompt && (
          <p className="text-sm text-teal-700 bg-teal-50 rounded p-3 mt-3">
            {planPrompt}
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-4 flex-1">
        {fields.map((field) => {
          const fieldContent = caseFileContent[field.key];
          const isActive = !field.readOnly;
          const isVoiceTarget = voiceTargetField === field.key && isVoiceActive;

          return (
            <div key={field.key} className="flex flex-col gap-2">
              {/* Label with lock icon for locked fields */}
              <label
                className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 ${
                  isActive ? 'text-slate-900' : 'text-slate-900'
                }`}
              >
                <span>{field.label}</span>
                {field.locked && (
                  <svg
                    className="w-3 h-3 text-slate-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </label>

              {/* Textarea with colored left border */}
              <textarea
                ref={(el) => {
                  if (el) textareaRefs.current[field.key] = el;
                }}
                value={fieldContent}
                onChange={(e) => {
                  if (!field.readOnly) {
                    handleFieldChange(field.key, e.target.value);
                  }
                }}
                onFocus={() => !field.readOnly && handleFieldFocus(field.key)}
                onBlur={() => !field.readOnly && handleFieldBlur(field.key)}
                placeholder={field.question}
                disabled={field.readOnly}
                className={`w-full min-h-20 px-4 py-3 rounded border-l-4 transition-all resize-none focus:outline-none ${
                  isActive
                    ? 'bg-white border-slate-200 shadow-sm focus:shadow-md focus:ring-2 focus:ring-teal-500/20 cursor-text'
                    : 'bg-slate-50 border-slate-200 text-slate-900 cursor-not-allowed'
                } ${
                  isVoiceTarget ? 'ring-4 ring-blue-400/50' : ''
                }`}
                style={
                  isActive || field.readOnly
                    ? { borderLeftColor: field.borderColor }
                    : { borderLeftColor: field.borderColor }
                }
              />

              {/* Feedback (if any) */}
              {fieldFeedback && field.key === 'solution' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
                  {fieldFeedback}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button - only show when fields are active */}
      {currentPhase !== 'warmup' && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={() => {
              // Submit the current phase's primary field
              const primaryField =
                currentPhase === 'plan' ? 'problem' :
                currentPhase === 'solve' ? 'solution' :
                'explanation';
              onFieldSubmit(primaryField, caseFileContent[primaryField]);
            }}
            className="w-full px-4 py-3 text-white font-semibold rounded hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#1D9E75' }}
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
};
