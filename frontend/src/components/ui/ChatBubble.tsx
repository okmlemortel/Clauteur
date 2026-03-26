import React from 'react';

interface ChatBubbleProps {
  message: string;
  sender: 'student' | 'tutor';
  timestamp?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  sender,
  timestamp,
}) => {
  const isStudent = sender === 'student';

  return (
    <div
      className={`flex ${isStudent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl ${
          isStudent
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-slate-200 text-slate-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm leading-relaxed">{message}</p>
        {timestamp && (
          <p
            className={`text-xs mt-1 ${
              isStudent ? 'text-indigo-100' : 'text-slate-600'
            }`}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
};
