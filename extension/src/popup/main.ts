import { saveBookmark, ApiError, NetworkError } from "../utils/api";
import type { BookmarkCreate } from "../types/bookmark";

type Status = "idle" | "saving" | "saved" | "error";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const urlInput = $<HTMLInputElement>("url");
const titleInput = $<HTMLInputElement>("title");
const tagsInput = $<HTMLInputElement>("tags");
const notesInput = $<HTMLTextAreaElement>("notes");
const btnSave = $<HTMLButtonElement>("btn-save");
const btnDetails = $<HTMLButtonElement>("btn-details");
const detailsPanel = $<HTMLDivElement>("details");
const toggleText = $<HTMLSpanElement>("toggle-text");
const toggleIcon = $<HTMLSpanElement>("toggle-icon");
const statusEl = $<HTMLDivElement>("status");

let detailsOpen = false;

function setStatus(state: Status, message?: string) {
  statusEl.className = "status";

  if (state === "idle") {
    statusEl.classList.add("hidden");
    return;
  }

  statusEl.textContent = message ?? "";
  statusEl.classList.add(state);
}

function setFormEnabled(enabled: boolean) {
  titleInput.disabled = !enabled;
  tagsInput.disabled = !enabled;
  notesInput.disabled = !enabled;
  btnSave.disabled = !enabled;
}

function toggleDetails() {
  detailsOpen = !detailsOpen;
  detailsPanel.classList.toggle("collapsed", !detailsOpen);
  toggleText.textContent = detailsOpen ? "Hide details" : "Add details";
  toggleIcon.classList.toggle("open", detailsOpen);
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

async function handleSave() {
  const url = urlInput.value.trim();
  const title = titleInput.value.trim();

  if (!url) {
    setStatus("error", "No URL to save");
    return;
  }
  if (!title) {
    setStatus("error", "Title is required");
    return;
  }

  const data: BookmarkCreate = { url, title };

  const tags = parseTags(tagsInput.value);
  if (tags.length > 0) data.tags = tags;

  const note = notesInput.value.trim();
  if (note) data.note = note;

  setStatus("saving", "Saving bookmark...");
  setFormEnabled(false);

  try {
    await saveBookmark(data);
    setStatus("saved", "Bookmark saved!");
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    setFormEnabled(true);

    if (err instanceof NetworkError) {
      setStatus("error", err.message);
    } else if (err instanceof ApiError) {
      if (err.status === 409) {
        setStatus("error", "This URL is already bookmarked");
      } else {
        setStatus("error", `Server error: ${err.message}`);
      }
    } else {
      setStatus("error", "An unexpected error occurred");
    }
  }
}

async function init() {
  btnDetails.addEventListener("click", toggleDetails);
  btnSave.addEventListener("click", handleSave);

  // Auto-fill URL and title from active tab
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) urlInput.value = tab.url;
    if (tab?.title) titleInput.value = tab.title;
  } catch {
    // Not running as extension (e.g. dev mode) — leave fields empty
  }
}

init();
