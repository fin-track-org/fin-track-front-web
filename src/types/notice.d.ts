export interface Notice {
  id: number;
  title: string;
  summary: string;
  detailUrl?: string;
  isPinned: boolean;
  isVisible: boolean;
  createdAt: string;
}
