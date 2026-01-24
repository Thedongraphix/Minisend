import { Metadata } from 'next';
import { Providers } from './providers';
import { PretiumDashboard } from '@/app/components/dashboard/PretiumDashboard';

export const metadata: Metadata = {
  title: 'Minisend Orders',
  description: 'Monitor and track all transactions',
};

export default function PretiumDashboardPage() {
  return (
    <Providers>
      <PretiumDashboard />
    </Providers>
  );
}
