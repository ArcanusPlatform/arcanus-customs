import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPITileProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
}

export default function KPITile({
  title,
  value,
  subtext,
  icon: Icon,
  color,
  trend,
}: KPITileProps) {
  const colorMap = {
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  const iconColorMap = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtext}</p>
          {trend && (
            <p className="mt-1 text-xs font-medium text-slate-600">{trend.value}</p>
          )}
        </div>
        <Icon className={`h-8 w-8 ${iconColorMap[color]}`} />
      </div>
    </div>
  );
}
