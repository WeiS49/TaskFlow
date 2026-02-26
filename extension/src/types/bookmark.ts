export interface BookmarkCreate {
  url: string;
  title: string;
  note?: string;
  tags?: string[];
}

export interface BookmarkResponse {
  id: number;
  url: string;
  title: string;
  note: string;
  summary: string;
  ai_status: "pending" | "processing" | "completed" | "failed";
  ai_error: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TagResponse {
  id: number;
  name: string;
  count: number;
}

export interface ApiError {
  detail: string;
}
