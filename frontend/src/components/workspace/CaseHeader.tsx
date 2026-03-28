'use client';

import React from 'react';

interface CaseHeaderProps {
  title: string;
  skillTags?: string[];
}

export const CaseHeader: React.FC<CaseHeaderProps> = ({ title, skillTags = [] }) => {
  return (
    <div className="p-4 border-b border-slate-200 bg-slate-50">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <span>🔍</span>
        <span>Case: {title}</span>
      </h3>
      {/* Skills are hidden from student - only visible in parent reports */}
    </div>
  );
};
