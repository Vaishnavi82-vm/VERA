// Storage utilities for VÉRA app

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  onboarded?: boolean;
  avatar?: string; // data URL
}

// Legacy interface for migration
interface LegacyUser {
  name: string;
  email: string;
  password: string;
  onboarded?: boolean;
  avatar?: string;
}

export interface Review {
  id: string;
  rating: number; // 1–5
  title: string;
  body: string;
  createdAt: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  body: string;
  createdAt: number;
}

export interface UserPreferences {
  location: string;
  lifestyle: 'student' | 'corporate' | 'other';
  style: 'casual' | 'elegant' | 'trendy' | 'minimal';
  restrictions: {
    sleevelessAllowed: boolean;
    shortOutfitsAllowed: boolean;
  };
}

export interface WardrobeItem {
  id: string;
  type: string;
  image: string;
  color: string;
  wornCount: number;
  name?: string;
}

export interface SavedOutfit {
  id: string;
  items: WardrobeItem[];
  occasion?: string;
  date?: string;
}

export interface CalendarEvent {
  date: string;
  event: string;
  location: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vera';
  text: string;
  timestamp: number;
}

// --- Password hashing ---
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Helpers ---
const get = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch { return fallback; }
};

const set = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

// --- User-scoped key helper ---
function userKey(base: string, email: string): string {
  return `${base}_${email}`;
}

// --- Migrate legacy plaintext users on first access ---
function getUsers(): User[] {
  const raw = get<(User | LegacyUser)[]>('vera_users', []);
  return raw.map(u => {
    // Already migrated users have passwordHash
    if ('passwordHash' in u && u.passwordHash) return u as User;
    // Legacy users have password field — keep as-is, migration happens at login/signup
    return u as unknown as User;
  });
}

export const storage = {
  getUsers,
  addUser: async (name: string, email: string, password: string): Promise<void> => {
    const users = get<User[]>('vera_users', []);
    const passwordHash = await hashPassword(password);
    users.push({ name, email, passwordHash, onboarded: false });
    set('vera_users', users);
  },
  findUser: (email: string): User | undefined =>
    getUsers().find(u => u.email === email),

  verifyPassword: async (user: User, password: string): Promise<boolean> => {
    // Handle legacy plaintext passwords during migration
    const raw = get<Record<string, string>[]>('vera_users', []);
    const stored = raw.find(u => u.email === user.email);
    if (!stored) return false;

    if ('password' in stored && stored.password && !('passwordHash' in stored && (stored as Record<string, string>).passwordHash)) {
      // Legacy user: compare plaintext, then migrate to hash
      if (stored.password === password) {
        const users = get<Record<string, string>[]>('vera_users', []);
        const idx = users.findIndex(u => u.email === user.email);
        if (idx !== -1) {
          const passwordHash = await hashPassword(password);
          delete users[idx].password;
          users[idx].passwordHash = passwordHash;
          set('vera_users', users);
        }
        return true;
      }
      return false;
    }

    // Normal hash comparison
    const inputHash = await hashPassword(password);
    return inputHash === user.passwordHash;
  },

  setCurrentUser: (email: string) => set('vera_current_user', email),
  getCurrentUser: (): string | null => {
    try {
      const item = localStorage.getItem('vera_current_user');
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  logout: () => localStorage.removeItem('vera_current_user'),

  // --- User-scoped data accessors ---
  getPreferences: (email: string): UserPreferences | null => get(userKey('vera_preferences', email), null),
  setPreferences: (email: string, prefs: UserPreferences) => set(userKey('vera_preferences', email), prefs),

  markOnboarded: (email: string) => {
    const users = get<User[]>('vera_users', []);
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) { users[idx].onboarded = true; set('vera_users', users); }
  },

  getWardrobe: (email: string): WardrobeItem[] => get(userKey('vera_wardrobe', email), []),
  addWardrobeItem: (email: string, item: WardrobeItem) => {
    const w = get<WardrobeItem[]>(userKey('vera_wardrobe', email), []);
    w.push(item);
    set(userKey('vera_wardrobe', email), w);
  },
  removeWardrobeItem: (email: string, id: string) => {
    const w = get<WardrobeItem[]>(userKey('vera_wardrobe', email), []).filter(i => i.id !== id);
    set(userKey('vera_wardrobe', email), w);
  },
  incrementWorn: (email: string, id: string) => {
    const w = get<WardrobeItem[]>(userKey('vera_wardrobe', email), []);
    const item = w.find(i => i.id === id);
    if (item) { item.wornCount++; set(userKey('vera_wardrobe', email), w); }
  },

  getCustomSections: (email: string): string[] => get(userKey('vera_custom_sections', email), []),
  addCustomSection: (email: string, name: string) => {
    const s = get<string[]>(userKey('vera_custom_sections', email), []);
    if (!s.includes(name)) { s.push(name); set(userKey('vera_custom_sections', email), s); }
  },

  getOutfits: (email: string): SavedOutfit[] => get(userKey('vera_outfits', email), []),
  saveOutfit: (email: string, outfit: SavedOutfit) => {
    const o = get<SavedOutfit[]>(userKey('vera_outfits', email), []);
    o.push(outfit);
    set(userKey('vera_outfits', email), o);
  },

  getEvents: (email: string): CalendarEvent[] => get(userKey('vera_events', email), []),
  addEvent: (email: string, event: CalendarEvent) => {
    const e = get<CalendarEvent[]>(userKey('vera_events', email), []);
    e.push(event);
    set(userKey('vera_events', email), e);
  },
  getEventForDate: (email: string, date: string): CalendarEvent | undefined =>
    get<CalendarEvent[]>(userKey('vera_events', email), []).find(e => e.date === date),

  getMessages: (email: string): ChatMessage[] => get(userKey('vera_messages', email), []),
  addMessage: (email: string, msg: ChatMessage) => {
    const m = get<ChatMessage[]>(userKey('vera_messages', email), []);
    m.push(msg);
    set(userKey('vera_messages', email), m);
  },

  getWishlist: (email: string): string[] => get(userKey('vera_wishlist', email), []),
  toggleWishlist: (email: string, id: string) => {
    const w = get<string[]>(userKey('vera_wishlist', email), []);
    const idx = w.indexOf(id);
    if (idx !== -1) w.splice(idx, 1); else w.push(id);
    set(userKey('vera_wishlist', email), w);
  },

  // --- Avatar ---
  setAvatar: (email: string, dataUrl: string | null) => {
    const users = get<User[]>('vera_users', []);
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) return;
    if (dataUrl) users[idx].avatar = dataUrl;
    else delete users[idx].avatar;
    set('vera_users', users);
  },

  // --- Reviews ---
  getReviews: (email: string): Review[] =>
    get<Review[]>(userKey('vera_reviews', email), []).sort((a, b) => b.createdAt - a.createdAt),
  addReview: (email: string, review: Omit<Review, 'id' | 'createdAt'>) => {
    const r = get<Review[]>(userKey('vera_reviews', email), []);
    r.push({ ...review, id: Date.now().toString(), createdAt: Date.now() });
    set(userKey('vera_reviews', email), r);
  },
  removeReview: (email: string, id: string) => {
    const r = get<Review[]>(userKey('vera_reviews', email), []).filter(x => x.id !== id);
    set(userKey('vera_reviews', email), r);
  },

  // --- Contact messages ---
  getContactMessages: (email: string): ContactMessage[] =>
    get<ContactMessage[]>(userKey('vera_contact', email), []).sort((a, b) => b.createdAt - a.createdAt),
  addContactMessage: (email: string, msg: Omit<ContactMessage, 'id' | 'createdAt'>) => {
    const m = get<ContactMessage[]>(userKey('vera_contact', email), []);
    m.push({ ...msg, id: Date.now().toString(), createdAt: Date.now() });
    set(userKey('vera_contact', email), m);
  },
};
