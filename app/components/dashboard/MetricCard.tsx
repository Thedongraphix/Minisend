'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    positive: boolean;
  };
}

export function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200">
      <p className="text-[13px] font-medium text-white/50 uppercase tracking-wide">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[32px] font-semibold text-white tracking-tight">{value}</p>
        {trend && (
          <span className={`text-[13px] font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[13px] text-white/40 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
