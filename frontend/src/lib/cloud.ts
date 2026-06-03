// VÉRA Cloud data layer — backend API and migration support.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

async function request<T>(url: string, options: RequestInit = {}, isForm = false): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    const text = await response.text();
    let message = response.statusText;
    try {
      const json = JSON.parse(text);
      message = json?.error || json?.message || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message || 'Request failed');
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return (await response.json()) as T;
}

export interface CloudWardrobeItem {
  id: string;
  image_url: string;
  imageUrl?: string;
  title?: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  email?: string;
  created_at: string;
  createdAt?: string;
  ai_analyzed: boolean;
  ai_description: string;
  worn_count: number;
  occasions: string[];
  style: string;
  primary_color: string;
  aesthetic: string;
}

export interface CloudOutfit {
  id: string;
  email: string;
  outfit_name: string;
  item_ids: string[];
  reasoning: string | null;
  occasion: string | null;
  mood: string | null;
  season: string | null;
  confidence: number | null;
  score?: number | null;
  color_harmony: string | null;
  style_compatibility?: number | null;
  suggested_accessories: string[];
  saved: boolean;
  worn: boolean;
  liked?: boolean;
  disliked?: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface CloudPreferences {
  email: string;
  location: string;
  lifestyle: string;
  style: string;
  restrictions: {
    sleevelessAllowed: boolean;
    shortOutfitsAllowed: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CloudChatMessage {
  message: string;
  reply: string;
  created_at: string;
}

export async function listWardrobe(userEmail: string): Promise<CloudWardrobeItem[]> {
  const data = await request<{ items: CloudWardrobeItem[] }>(`${API_BASE}/api/wardrobe?email=${encodeURIComponent(userEmail)}`);
  return data.items;
}

export async function uploadWardrobeItem(userEmail: string, file: File, category: string, subcategory = ''): Promise<CloudWardrobeItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('email', userEmail);
  formData.append('item_name', file.name);
  formData.append('category', category);
  formData.append('subcategory', subcategory);

  return request<CloudWardrobeItem>(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  }, true);
}

export async function deleteWardrobeItem(id: string) {
  await request(`${API_BASE}/api/wardrobe/${id}`, { method: 'DELETE' });
}

export async function markItemWorn(id: string, currentCount: number) {
  await request(`${API_BASE}/api/wardrobe/${id}/worn`, { method: 'PATCH' });
}

// ---------- Preferences ----------
export async function getPreferences(userEmail: string): Promise<CloudPreferences | null> {
  try {
    return await request<CloudPreferences>(`${API_BASE}/api/preferences/${encodeURIComponent(userEmail)}`);
  } catch {
    return null;
  }
}

export async function savePreferences(userEmail: string, prefs: {
  location: string;
  lifestyle: string;
  style: string;
  restrictions: { sleevelessAllowed: boolean; shortOutfitsAllowed: boolean };
}) {
  return request<CloudPreferences>(`${API_BASE}/api/preferences/${encodeURIComponent(userEmail)}`, {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

// ---------- Outfits ----------
export async function listOutfits(userEmail: string, opts?: { savedOnly?: boolean; limit?: number }): Promise<CloudOutfit[]> {
  const outfits = await request<CloudOutfit[]>(`${API_BASE}/api/outfits/${encodeURIComponent(userEmail)}`);
  let result = outfits;
  if (opts?.savedOnly) {
    result = result.filter((o) => o.saved);
  }
  if (opts?.limit) {
    result = result.slice(0, opts.limit);
  }
  return result;
}

export async function generateOutfits(userEmail: string, input: { occasion?: string; mood?: string; season?: string; count?: number }): Promise<CloudOutfit[]> {
  const query = new URLSearchParams();
  if (input.occasion) query.set('occasion', input.occasion);
  if (input.mood) query.set('mood', input.mood);
  if (input.season) query.set('season', input.season);
  if (input.count) query.set('count', String(input.count));

  return request<CloudOutfit[]>(`${API_BASE}/api/outfits/recommend/${encodeURIComponent(userEmail)}?${query.toString()}`);
}

export async function saveOutfit(id: string, saved = true) {
  return request<CloudOutfit>(`${API_BASE}/api/outfits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ saved }),
  });
}

export async function markOutfitWorn(id: string) {
  return request<CloudOutfit>(`${API_BASE}/api/outfits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ worn: true }),
  });
}

export async function generateCollage(outfitId: string): Promise<string> {
  return Promise.reject(new Error('Collage generation is not available in the local backend'));
}

export async function recordFeedback(userEmail: string, outfitId: string, feedback: { liked?: boolean; disliked?: boolean; worn?: boolean }) {
  return request<CloudOutfit>(`${API_BASE}/api/outfits/${encodeURIComponent(outfitId)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}

// ---------- Chat ----------
export async function sendChatMessage(userEmail: string, message: string): Promise<CloudChatMessage> {
  return request<CloudChatMessage>(`${API_BASE}/chat`, {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, message }),
  });
}

export async function listChatHistory(userEmail: string): Promise<CloudChatMessage[]> {
  try {
    return await request<CloudChatMessage[]>(`${API_BASE}/chat/history/${encodeURIComponent(userEmail)}`);
  } catch {
    return [];
  }
}

// ---------- Events ----------
export interface CloudEvent {
  id: string;
  email: string;
  date: string;
  event: string;
  location: string;
  created_at: string;
}

export async function listEvents(userEmail: string): Promise<CloudEvent[]> {
  try {
    return await request<CloudEvent[]>(`${API_BASE}/api/events/${encodeURIComponent(userEmail)}`);
  } catch {
    return [];
  }
}

export async function addEvent(userEmail: string, data: { date: string; event: string; location?: string }): Promise<CloudEvent> {
  return request<CloudEvent>(`${API_BASE}/api/events`, {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      date: data.date,
      event: data.event,
      location: data.location || '',
    }),
  });
}

export async function deleteEvent(userEmail: string, date: string): Promise<void> {
  await request(`${API_BASE}/api/events/${date}/${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
}

// ---------- Reviews ----------
export interface CloudReview {
  id: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
}

export async function listReviews(userEmail: string): Promise<CloudReview[]> {
  try {
    return await request<CloudReview[]>(`${API_BASE}/api/reviews/${encodeURIComponent(userEmail)}`);
  } catch {
    return [];
  }
}

export async function addReview(userEmail: string, data: { rating: number; title: string; body: string }): Promise<CloudReview> {
  return request<CloudReview>(`${API_BASE}/api/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      rating: data.rating,
      title: data.title,
      body: data.body,
    }),
  });
}

export async function deleteReview(reviewId: string): Promise<void> {
  await request(`${API_BASE}/api/reviews/${reviewId}`, { method: 'DELETE' });
}

// ---------- Wishlist ----------
export interface CloudWishlist {
  email: string;
  item_ids: string[];
  updated_at: string;
}

export async function getWishlist(userEmail: string): Promise<string[]> {
  try {
    const data = await request<CloudWishlist>(`${API_BASE}/api/wishlist/${encodeURIComponent(userEmail)}`);
    return data.item_ids || [];
  } catch {
    return [];
  }
}

export async function toggleWishlistItem(userEmail: string, itemId: string): Promise<string[]> {
  try {
    const data = await request<CloudWishlist>(`${API_BASE}/api/wishlist/${encodeURIComponent(userEmail)}/${encodeURIComponent(itemId)}`, {
      method: 'POST',
    });
    return data.item_ids || [];
  } catch {
    return [];
  }
}

export async function removeWishlistItem(userEmail: string, itemId: string): Promise<string[]> {
  try {
    const data = await request<CloudWishlist>(`${API_BASE}/api/wishlist/${encodeURIComponent(userEmail)}/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
    return data.item_ids || [];
  } catch {
    return [];
  }
}

// ---------- Contact ----------
export interface CloudContactMessage {
  id: string;
  email: string;
  name: string;
  contact_email: string;
  topic: string;
  body: string;
  created_at: string;
}

export async function listContactMessages(userEmail: string): Promise<CloudContactMessage[]> {
  try {
    return await request<CloudContactMessage[]>(`${API_BASE}/api/contact/messages/${encodeURIComponent(userEmail)}`);
  } catch {
    return [];
  }
}

export async function sendContactMessage(userEmail: string, data: { name: string; contact_email: string; topic: string; body: string }): Promise<CloudContactMessage> {
  return request<CloudContactMessage>(`${API_BASE}/api/contact`, {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      name: data.name,
      contact_email: data.contact_email,
      topic: data.topic,
      body: data.body,
    }),
  });
}

export async function deleteContactMessage(messageId: string): Promise<void> {
  await request(`${API_BASE}/api/contact/${messageId}`, { method: 'DELETE' });
}
