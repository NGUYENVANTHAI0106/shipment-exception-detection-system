import { Status } from '../data/mockData';

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<Status, string> = {
    open: 'Mở',
    notified: 'Đã thông báo',
    in_progress: 'Đang xử lý',
    resolved: 'Đã xử lý',
  };

  const styles: Record<Status, string> = {
    open: 'bg-slate-100 text-slate-700',
    notified: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    resolved: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
