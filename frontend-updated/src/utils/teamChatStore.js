// Store for the staff/admin "Team Discussion" thread — a single shared
// channel both the Staff Dashboard and Admin Dashboard read from and write
// to, so a message posted by either side shows up for everyone else.
//
// Backed by a localStorage cache for instant, synchronous reads, while
// every message is also persisted to MongoDB via the backend API.

import { fetchTeamMessages, postTeamMessage } from '../services/teamChatService';

const STORAGE_KEY = 'gn_team_messages';

const defaultMessages = [];

export function getTeamMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMessages));
  } catch {
    // storage unavailable — ignore
  }
  return defaultMessages;
}

/** Append a message to the shared team thread and persist it. Returns the updated list. */
export function addTeamMessage({ author, role, text }) {
  const current = getTeamMessages();
  const message = {
    id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author,
    role,
    text,
    time: new Date().toISOString(),
  };
  const updated = [...current, message];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage unavailable — ignore
  }
  postTeamMessage({ author, role, text }).catch((err) =>
    console.warn('Could not save team message to server:', err.message)
  );
  return updated;
}

/**
 * Pull the shared team thread from MongoDB and replace the local cache with
 * it. Call this after a staff/admin login so the dashboard opens with the
 * real, shared conversation instead of stale local data.
 */
export async function syncTeamMessagesFromServer() {
  try {
    const res = await fetchTeamMessages();
    const messages = res.data.messages || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    return messages;
  } catch (err) {
    console.warn('Could not sync team messages from server:', err.message);
    return getTeamMessages();
  }
}
