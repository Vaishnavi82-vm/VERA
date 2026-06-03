export interface WardrobeItem {
  id: string;
  category: string;
  subcategory?: string;
  color?: string;
  pattern?: string;
  style?: string;
  seasons?: string[];
  occasions?: string[];
  fit?: string;
  name?: string;
}

export interface UserPreferences {
  style: string;
  lifestyle: string;
  location: string;
  restrictions: {
    sleevelessAllowed: boolean;
    shortOutfitsAllowed: boolean;
  };
}

export interface OutfitRecommendation {
  id: string;
  outfit_name: string;
  item_ids: string[];
  reasoning: string;
  occasion: string;
  mood?: string;
  season?: string;
  confidence: number;
  score: number;
  color_harmony: string;
  style_compatibility: number;
  suggested_accessories: string[];
}

const COLOR_GROUPS: Record<string, string> = {
  black: 'neutral',
  white: 'neutral',
  gray: 'neutral',
  grey: 'neutral',
  beige: 'neutral',
  cream: 'neutral',
  tan: 'neutral',
  brown: 'neutral',
  navy: 'blue',
  blue: 'blue',
  red: 'red',
  burgundy: 'red',
  pink: 'pink',
  green: 'green',
  olive: 'green',
  yellow: 'yellow',
  mustard: 'yellow',
  orange: 'orange',
  purple: 'purple',
};

const STYLE_GROUPS: Record<string, string> = {
  casual: 'casual',
  street: 'casual',
  relaxed: 'casual',
  elegant: 'elegant',
  formal: 'elegant',
  office: 'elegant',
  classic: 'classic',
  minimal: 'classic',
  trendy: 'modern',
  modern: 'modern',
  sporty: 'sporty',
  boho: 'boho',
  edgy: 'edgy',
};

const OCCASION_ALIASES: Record<string, string[]> = {
  everyday: ['everyday', 'casual', 'weekend'],
  work: ['work', 'office', 'professional', 'business'],
  date: ['date', 'dinner', 'romantic', 'night out'],
  brunch: ['brunch', 'daytime'],
  party: ['party', 'celebration', 'evening'],
  travel: ['travel', 'vacation', 'journey'],
  wedding: ['wedding', 'formal', 'ceremony'],
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  tops: ['tops', 'top', 'shirt', 'blouse', 'tee', 'tshirt'],
  bottoms: ['bottoms', 'pants', 'jeans', 'trousers', 'skirt'],
  dresses: ['dress', 'dresses'],
  footwear: ['footwear', 'shoes', 'sneakers', 'boots', 'heels', 'sandals'],
  accessories: ['accessories', 'bag', 'handbag', 'belt', 'jewelry', 'scarf'],
};

function normalize(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function splitTokens(value?: string): string[] {
  return normalize(value).replace(/\//g, ' ').split(/\s+/).filter(Boolean);
}

function colorGroup(color?: string): string {
  for (const token of splitTokens(color)) {
    if (COLOR_GROUPS[token]) {
      return COLOR_GROUPS[token];
    }
  }
  return 'neutral';
}

function styleGroup(style?: string): string {
  for (const token of splitTokens(style)) {
    if (STYLE_GROUPS[token]) {
      return STYLE_GROUPS[token];
    }
  }
  return normalize(style) || 'classic';
}

function matchAlias(value: string, target: string, aliases: Record<string, string[]>): boolean {
  const normalized = normalize(value);
  if (normalized === normalize(target)) {
    return true;
  }
  return aliases[normalize(target)]?.includes(normalized) ?? false;
}

function colorSimilarity(a?: string, b?: string): number {
  const groupA = colorGroup(a);
  const groupB = colorGroup(b);
  if (groupA === groupB) return 1;
  if (groupA === 'neutral' || groupB === 'neutral') return 0.9;
  const complementary: Record<string, string[]> = {
    blue: ['orange'],
    red: ['green'],
    yellow: ['purple'],
    orange: ['blue'],
    green: ['red'],
    purple: ['yellow'],
  };
  if (complementary[groupA]?.includes(groupB)) return 0.85;
  return 0.5;
}

function styleCompatibility(a?: string, b?: string): number {
  const groupA = styleGroup(a);
  const groupB = styleGroup(b);
  if (groupA === groupB) return 1;
  if (new Set([groupA, groupB]).has('casual') && new Set([groupA, groupB]).has('sporty')) return 0.85;
  if (new Set([groupA, groupB]).has('elegant') && new Set([groupA, groupB]).has('classic')) return 0.9;
  return 0.6;
}

function occasionScore(item: WardrobeItem, occasion: string): number {
  if (!occasion) return 0.8;
  const occasions = item.occasions || [];
  if (!occasions.length) return 0.8;
  for (const entry of occasions) {
    if (matchAlias(entry, occasion, OCCASION_ALIASES)) {
      return 1;
    }
  }
  return 0.4;
}

function seasonScore(item: WardrobeItem, season?: string): number {
  if (!season) return 0.85;
  const seasons = (item.seasons || []).map(normalize);
  if (!seasons.length) return 0.8;
  if (seasons.includes(normalize(season))) return 1;
  return 0.3;
}

function preferenceScore(item: WardrobeItem, preferences: UserPreferences, occasion: string, mood?: string): number {
  let score = 0;
  let count = 0;

  if (preferences.style) {
    score += styleGroup(item.style) === styleGroup(preferences.style) ? 1 : 0.5;
    count += 1;
  }
  if (occasion) {
    score += occasionScore(item, occasion);
    count += 1;
  }
  if (mood) {
    score += splitTokens(item.style).includes(normalize(mood)) ? 1 : 0.6;
    count += 1;
  }

  return count > 0 ? score / count : 0.75;
}

function average(numbers: number[]): number {
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
}

function composeOutfits(items: WardrobeItem[]) {
  const groups: Record<string, WardrobeItem[]> = {
    tops: [],
    bottoms: [],
    dresses: [],
    footwear: [],
    accessories: [],
  };

  for (const item of items) {
    const category = normalize(item.category);
    let placed = false;
    for (const [group, aliases] of Object.entries(CATEGORY_GROUPS)) {
      if (aliases.some((alias) => category.includes(alias))) {
        groups[group].push(item);
        placed = true;
        break;
      }
    }
    if (!placed && item.subcategory && CATEGORY_GROUPS.accessories.some((alias) => normalize(item.subcategory).includes(alias))) {
      groups.accessories.push(item);
    }
  }

  const tops = groups.tops.slice(0, 6);
  const bottoms = groups.bottoms.slice(0, 6);
  const dresses = groups.dresses.slice(0, 6);
  const footwear = groups.footwear.slice(0, 6);
  const accessories = groups.accessories.slice(0, 3);

  const accessoryOptions: WardrobeItem[][] = [[]];
  for (let i = 0; i < accessories.length && i < 2; i += 1) {
    accessoryOptions.push([accessories[i]]);
  }

  const combinations: WardrobeItem[][] = [];
  for (const dress of dresses) {
    for (const shoe of footwear) {
      for (const accessory of accessoryOptions) {
        combinations.push([dress, shoe, ...accessory]);
      }
    }
  }
  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of footwear) {
        for (const accessory of accessoryOptions) {
          combinations.push([top, bottom, shoe, ...accessory]);
        }
      }
    }
  }

  return combinations;
}

export function generateOutfitRecommendations(
  wardrobe: WardrobeItem[],
  preferences: UserPreferences,
  options: { occasion?: string; mood?: string; season?: string; count?: number } = {},
): OutfitRecommendation[] {
  const combos = composeOutfits(wardrobe);
  const scored = combos.map((items) => {
    const colorScores: number[] = [];
    const styleScores: number[] = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        colorScores.push(colorSimilarity(items[i].color, items[j].color));
        styleScores.push(styleCompatibility(items[i].style, items[j].style));
      }
    }
    const colorHarmony = average(colorScores.length ? colorScores : [1]);
    const styleCompatibilityScore = average(styleScores.length ? styleScores : [0.85]);
    const occasionScores = items.map((item) => occasionScore(item, options.occasion ?? 'everyday'));
    const seasonScores = items.map((item) => seasonScore(item, options.season));
    const preferenceScores = items.map((item) => preferenceScore(item, preferences, options.occasion ?? 'everyday', options.mood));

    const score =
      colorHarmony * 0.28 +
      styleCompatibilityScore * 0.24 +
      average(occasionScores) * 0.18 +
      average(seasonScores) * 0.12 +
      average(preferenceScores) * 0.18;

    return {
      id: items.map((item) => item.id).join('-'),
      outfit_name: `${normalize(options.occasion) || 'Curated'} look`,
      item_ids: items.map((item) => item.id),
      reasoning: `A ${options.occasion ?? 'custom'} outfit composed for your wardrobe and preferred style.`,
      occasion: options.occasion ?? 'everyday',
      mood: options.mood,
      season: options.season,
      confidence: Math.max(0, Math.min(1, score)),
      score: Math.max(0, Math.min(1, score)),
      color_harmony:
        colorHarmony >= 0.85
          ? 'Natural harmony'
          : colorHarmony >= 0.65
          ? 'Balanced contrast'
          : colorHarmony >= 0.45
          ? 'Elevated mix'
          : 'Bold contrast',
      style_compatibility: styleCompatibilityScore,
      suggested_accessories: items
        .filter((item) => normalize(item.category).includes('accessory') || normalize(item.category).includes('bag'))
        .map((item) => item.name || item.subcategory || item.category),
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, options.count ?? 5);
}
