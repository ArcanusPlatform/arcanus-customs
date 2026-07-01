/**
 * ErrorAlert Component
 *
 * Displays API errors with appropriate styling and actions
 */

import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ErrorState } from '@/lib/useAPIError';

interface ErrorAlertProps {
  error: ErrorState;
  onClose?: () => void;
  className?: string;
}

export default function ErrorAlert({ error, onClose, className = '' }: ErrorAlertProps) {
  const { title, message, action, severity } = error;

  // Determine colors and icon based on severity
  const severityConfig = {
    error: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
      Icon: AlertCircle,
    },
    warning: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-200',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-600 dark:text-blue-400',
      Icon: Info,
    },
  };

  const config = severityConfig[severity];
  const IconComponent = config.Icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <IconComponent className={`${config.iconColor} flex-shrink-0 mt-0.5`} size={20} />

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${config.textColor} mb-1`}>{title}</h3>

          <p className={`${config.textColor} text-sm mb-0`}>{message}</p>

          {action && <p className={`${config.textColor} text-sm mt-2 italic`}>{action}</p>}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            aria-label="Close error message"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
