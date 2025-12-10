'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <div className="border border-gray-800/50 rounded-2xl p-6 bg-[#111]">
      <div className="space-y-2">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-medium text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
