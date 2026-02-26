import type {
  BookmarkCreate,
  BookmarkResponse,
  TagResponse,
} from "../types/bookmark";

const API_BASE = "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Cannot connect to server. Is the BookMark API running?");
    this.name = "NetworkError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) {
        message =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export async function saveBookmark(
  data: BookmarkCreate,
): Promise<BookmarkResponse> {
  return request<BookmarkResponse>("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}

export async function fetchTags(): Promise<string[]> {
  try {
    const tags = await request<TagResponse[]>("/api/tags");
    return tags.map((t) => t.name);
  } catch {
    return [];
  }
}
