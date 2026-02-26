const API_BASE = "http://localhost:8000";

export async function saveBookmark(data: {
  url: string;
  title: string;
  note?: string;
  tags?: string[];
}) {
  const res = await fetch(`${API_BASE}/api/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
