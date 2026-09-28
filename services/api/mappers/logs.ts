import type { LogEntry } from '../models/log';

export interface UiLogItem {
  id: number;
  createdBy: string;
  date: string;
  createdAt?: string;
  description: string;
  images: NonNullable<LogEntry['images']>;
  image: { uri?: string } | null;
}

export function mapLogsToUi(logs: LogEntry[]): UiLogItem[] {
  const transformed = logs.map((log) => ({
    id: log.id,
    createdBy: log.user
      ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim()
      : 'Unknown User',
    date: log.createdAt
      ? new Date(log.createdAt).toLocaleDateString()
      : 'N/A',
    createdAt: log.createdAt,
    description: log.note || 'No description',
    images: log.images || [],
    image:
      log.images && log.images.length > 0
        ? { uri: log.images[0].imageUrl }
        : null,
  }));

  return transformed.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date).getTime();
    const dateB = new Date(b.createdAt || b.date).getTime();
    return dateB - dateA;
  });
}
