export interface Article {
  id: string;
  source: string;
  category: string;
  headline: string;
  summary: string;
  image_url: string | null;
  published_at: string;
}

export interface LeaderboardEntry {
  id: string;
  headline: string;
  category: string;
  image_url: string | null;
  rolls: number;
}
