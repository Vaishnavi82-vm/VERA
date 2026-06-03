// VÉRA Cloud data layer — API wrapper for wardrobe, preferences, and outfits.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface CloudWardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  colors: string[];
  primary_color: string | null;
  pattern: string | null;
  style: string | null;
  aesthetic: string | null;
  seasons: string[];
  occasions: string[];
  gender: string | null;
  ai_description: string | null;
  ai_analyzed: boolean;
  worn_count: number;
  last_worn_at: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface CloudOutfit {
  id: string;
  user_id: string;
  title: string;
  reasoning: string | null;
  occasion: string | null;
  mood: string | null;
  weather: Record<string, unknown> | null;
  confidence: number | null;
  color_harmony: string | null;
  suggested_accessories: string[];
  item_ids: string[];
  collage_url: string | null;
  saved: boolean;
  worn: boolean;
  worn_at: string | null;
  created_at: string;
}

export interface CloudPreferences {
  user_id: string;
  location: string | null;
  lifestyle: string | null;
  style: string | null;
  sleeveless_allowed: boolean;
  short_outfits_allowed: boolean;
  extra: Record<string, any>;
}

async function request<T>(path: string, options: RequestInit = {}, isForm = false) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...(options.headers ?? {}), ...(isForm ? {} : { Accept: 'application/json' }) },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function prefsStorageKey(userId: string) {
  return `vera_preferences_${userId}`;
}

function outfitsStorageKey(userId: string) {
  return `vera_outfits_${userId}`;
}

function loadFromLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToLocalStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Wardrobe ----------
export async function listWardrobe(userEmail: string): Promise<CloudWardrobeItem[]> {
  const data = await request<{ items: CloudWardrobeItem[] }>(`/api/wardrobe?email=${encodeURIComponent(userEmail)}`);
  return data.items;
}

export async function uploadWardrobeImage(userEmail: string, file: File): Promise<CloudWardrobeItem> {
  const form = new FormData();
  form.append('email', userEmail);
  form.append('item_name', file.name);
  form.append('image', file);

  return request<CloudWardrobeItem>('/api/upload', {
    method: 'POST',
    body: form,
  }, true);
}

export async function createWardrobeItem(userId: string, imageUrl: string, hint?: { category?: string; name?: string }): Promise<CloudWardrobeItem> {
  throw new Error('Creating a wardrobe item by image URL is not supported in this build.');
}

export async function deleteWardrobeItem(id: string) {
  await request(`/api/wardrobe/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function markItemWorn(id: string, currentCount: number) {
  await request(`/api/wardrobe/${encodeURIComponent(id)}/worn`, {
    method: 'PATCH',
    body: JSON.stringify({ currentCount }),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------- Preferences ----------
export async function getPreferences(userId: string): Promise<CloudPreferences | null> {
  return loadFromLocalStorage<CloudPreferences>(prefsStorageKey(userId));
}

export async function savePreferences(userId: string, prefs: Partial<Omit<CloudPreferences, 'user_id' | 'extra'>> & { extra?: any }) {
  const current = await getPreferences(userId);
  const updated: CloudPreferences = {
    user_id: userId,
    location: prefs.location ?? current?.location ?? null,
    lifestyle: prefs.lifestyle ?? current?.lifestyle ?? null,
    style: prefs.style ?? current?.style ?? null,
    sleeveless_allowed: prefs.sleeveless_allowed ?? current?.sleeveless_allowed ?? false,
    short_outfits_allowed: prefs.short_outfits_allowed ?? current?.short_outfits_allowed ?? false,
    extra: prefs.extra ?? current?.extra ?? {},
  };
  saveToLocalStorage(prefsStorageKey(userId), updated);
}

// ---------- Outfits ----------
export async function listOutfits(userId: string, opts?: { savedOnly?: boolean; limit?: number }): Promise<CloudOutfit[]> {
  const outfits = loadFromLocalStorage<CloudOutfit[]>(outfitsStorageKey(userId)) ?? [];
  let result = outfits;
  if (opts?.savedOnly) {
    result = result.filter((outfit) => outfit.saved);
  }
  if (opts?.limit) {
    result = result.slice(0, opts.limit);
  }
  return result;
}

export async function generateOutfits(_input: { occasion?: string; mood?: string; weather?: unknown; count?: number }): Promise<CloudOutfit[]> {
  throw new Error('Outfit generation is not available in this build.');
}

export async function saveOutfit(id: string, saved = true) {
  throw new Error('Outfit saving is not available in this build.');
}

export async function markOutfitWorn(id: string) {
  throw new Error('Marking an outfit as worn is not available in this build.');
}

export async function generateCollage(_outfitId: string): Promise<string> {
  throw new Error('Collage generation is not available in this build.');
}

export async function recordFeedback(userId: string, outfitId: string, liked: boolean) {
  throw new Error('Recording outfit feedback is not available in this build.');
}
