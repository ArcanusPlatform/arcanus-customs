import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackButtonsProps {
  onFeedback?: (feedback: 'helpful' | 'not-helpful') => void;
  title?: string;
}

export default function FeedbackButtons({ onFeedback, title = 'Was this helpful?' }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = React.useState<'helpful' | 'not-helpful' | null>(null);

  const handleFeedback = (type: 'helpful' | 'not-helpful') => {
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback('helpful')}
          className={`rounded-lg p-2 transition-colors ${
            feedback === 'helpful'
              ? 'bg-green-100 text-green-600'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="Mark as helpful"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleFeedback('not-helpful')}
          className={`rounded-lg p-2 transition-colors ${
            feedback === 'not-helpful'
              ? 'bg-red-100 text-red-600'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="Mark as not helpful"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
