import { Metadata } from 'next';
import { Providers } from './providers';
import { PretiumDashboard } from '@/app/components/dashboard/PretiumDashboard';

export const metadata: Metadata = {
  title: 'Pretium Orders Dashboard | Minisend',
  description: 'Monitor and track all Pretium transactions',
};

export default function PretiumDashboardPage() {
  return (
    <Providers>
      <PretiumDashboard />
    </Providers>
  );
}
