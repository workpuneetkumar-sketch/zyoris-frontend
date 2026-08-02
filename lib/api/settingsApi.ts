// lib/api/settingsApi.ts
// Per-user application preferences
// Endpoints:
//   GET    /settings          – list all settings
//   GET    /settings/{key}    – get a single setting
//   PUT    /settings/{key}    – create or replace (upsert) a setting
//   DELETE /settings/{key}    – delete a setting

import api from "@/lib/api/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserSetting {
    key: string;
    value: string;
}

export type SettingsMap = Record<string, string>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise the various response shapes the backend may return. */
function normaliseList(raw: unknown): UserSetting[] {
    if (Array.isArray(raw)) return raw as UserSetting[];
    if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as UserSetting[];
        if (Array.isArray(obj.settings)) return obj.settings as UserSetting[];
    }
    return [];
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** GET /settings – returns all user preferences as a flat map { key → value }. */
export async function fetchAllSettings(): Promise<SettingsMap> {
    const res = await api.get("/settings");
    const list = normaliseList(res.data);
    return Object.fromEntries(list.map((s) => [s.key, s.value]));
}

/** GET /settings/{key} */
export async function fetchSetting(key: string): Promise<string | null> {
    try {
        const res = await api.get(`/settings/${encodeURIComponent(key)}`);
        const raw = res.data;
        // backend may return { key, value } or just the value directly
        if (raw && typeof raw === "object" && "value" in raw) return String(raw.value);
        return String(raw);
    } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
    }
}

/** PUT /settings/{key} – idempotent upsert. */
export async function saveSetting(key: string, value: string): Promise<void> {
    await api.put(`/settings/${encodeURIComponent(key)}`, { value });
}

/** DELETE /settings/{key} */
export async function deleteSetting(key: string): Promise<void> {
    await api.delete(`/settings/${encodeURIComponent(key)}`);
}

// ── Convenience helpers for boolean / string preferences ─────────────────────

/** Save a boolean preference (stored as "true" / "false"). */
export async function saveBoolSetting(key: string, value: boolean): Promise<void> {
    await saveSetting(key, String(value));
}

/** Save multiple settings at once (sequential PUTs). */
export async function saveSettingsBatch(entries: SettingsMap): Promise<void> {
    await Promise.all(
        Object.entries(entries).map(([key, value]) => saveSetting(key, value))
    );
}
