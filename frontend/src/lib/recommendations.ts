import type { WardrobeItem, UserPreferences, CalendarEvent } from './storage';

interface WeatherData {
  temp: number;
  condition: string;
}

const COLOR_HARMONY: Record<string, string[]> = {
  black: ['white', 'red', 'gold', 'beige', 'gray', 'navy'],
  white: ['black', 'navy', 'blue', 'red', 'beige', 'pink'],
  navy: ['white', 'beige', 'cream', 'gold', 'pink'],
  beige: ['black', 'navy', 'brown', 'white', 'green'],
  red: ['black', 'white', 'navy', 'gray', 'denim'],
  blue: ['white', 'beige', 'gray', 'brown', 'cream'],
  green: ['beige', 'white', 'brown', 'cream', 'black'],
  pink: ['white', 'navy', 'gray', 'black', 'beige'],
  gray: ['black', 'white', 'pink', 'red', 'navy'],
  brown: ['beige', 'cream', 'white', 'green', 'blue'],
  cream: ['navy', 'brown', 'black', 'green', 'beige'],
  gold: ['black', 'navy', 'white', 'cream', 'brown'],
  denim: ['white', 'black', 'red', 'beige', 'cream'],
};

function colorsMatch(c1: string, c2: string): boolean {
  const l1 = c1.toLowerCase(), l2 = c2.toLowerCase();
  if (l1 === l2) return true;
  return COLOR_HARMONY[l1]?.includes(l2) || COLOR_HARMONY[l2]?.includes(l1) || false;
}

function isWeatherAppropriate(item: WardrobeItem, weather: WeatherData): boolean {
  const t = item.type.toLowerCase();
  if (weather.temp > 28) {
    if (['jacket', 'sweater', 'coat', 'hoodie'].some(w => t.includes(w))) return false;
  }
  if (weather.temp < 15) {
    if (['shorts', 'tank', 'sleeveless', 'sandals'].some(w => t.includes(w))) return false;
  }
  return true;
}

function respectsRestrictions(item: WardrobeItem, prefs: UserPreferences): boolean {
  const t = item.type.toLowerCase();
  if (!prefs.restrictions.sleevelessAllowed && ['sleeveless', 'tank', 'strapless'].some(w => t.includes(w))) return false;
  if (!prefs.restrictions.shortOutfitsAllowed && ['shorts', 'mini', 'short'].some(w => t.includes(w))) return false;
  return true;
}

export function generateOutfits(
  wardrobe: WardrobeItem[],
  weather: WeatherData,
  prefs: UserPreferences | null,
  event?: CalendarEvent,
  count: number = 7
): WardrobeItem[][] {
  const tops = wardrobe.filter(i => ['tops', 'top', 'shirt', 'blouse', 'tshirt', 't-shirt'].some(t => i.type.toLowerCase().includes(t)));
  const bottoms = wardrobe.filter(i => ['bottoms', 'bottom', 'pants', 'jeans', 'skirt', 'trousers'].some(t => i.type.toLowerCase().includes(t)));
  const dresses = wardrobe.filter(i => ['dress', 'dresses'].some(t => i.type.toLowerCase().includes(t)));
  const shoes = wardrobe.filter(i => ['shoes', 'shoe', 'sneakers', 'heels', 'boots'].some(t => i.type.toLowerCase().includes(t)));

  const outfits: WardrobeItem[][] = [];

  // Sort by least worn first
  const sortByWorn = (items: WardrobeItem[]) => [...items].sort((a, b) => a.wornCount - b.wornCount);

  const filteredTops = sortByWorn(tops.filter(i => {
    let ok = isWeatherAppropriate(i, weather);
    if (prefs) ok = ok && respectsRestrictions(i, prefs);
    return ok;
  }));

  const filteredBottoms = sortByWorn(bottoms.filter(i => {
    let ok = isWeatherAppropriate(i, weather);
    if (prefs) ok = ok && respectsRestrictions(i, prefs);
    return ok;
  }));

  const filteredDresses = sortByWorn(dresses.filter(i => {
    let ok = isWeatherAppropriate(i, weather);
    if (prefs) ok = ok && respectsRestrictions(i, prefs);
    return ok;
  }));

  const filteredShoes = sortByWorn(shoes);

  // Generate top+bottom combos
  for (const top of filteredTops) {
    for (const bottom of filteredBottoms) {
      if (outfits.length >= count) break;
      if (colorsMatch(top.color, bottom.color)) {
        const outfit: WardrobeItem[] = [top, bottom];
        if (filteredShoes.length > 0) outfit.push(filteredShoes[outfits.length % filteredShoes.length]);
        outfits.push(outfit);
      }
    }
    if (outfits.length >= count) break;
  }

  // Add dress outfits
  for (const dress of filteredDresses) {
    if (outfits.length >= count) break;
    const outfit: WardrobeItem[] = [dress];
    if (filteredShoes.length > 0) outfit.push(filteredShoes[outfits.length % filteredShoes.length]);
    outfits.push(outfit);
  }

  // If not enough, just create random combos
  while (outfits.length < count && filteredTops.length > 0 && filteredBottoms.length > 0) {
    const t = filteredTops[outfits.length % filteredTops.length];
    const b = filteredBottoms[outfits.length % filteredBottoms.length];
    outfits.push([t, b]);
  }

  return outfits.slice(0, count);
}

export function chatRecommend(message: string, wardrobe: WardrobeItem[], prefs: UserPreferences | null): string {
  const lower = message.toLowerCase();

  if (lower.includes('formal') || lower.includes('office') || lower.includes('meeting')) {
    const items = wardrobe.filter(i => ['blazer', 'shirt', 'trousers', 'dress', 'formal'].some(w => i.type.toLowerCase().includes(w)));
    if (items.length > 0) return `For a formal occasion, I'd suggest: ${items.slice(0, 3).map(i => i.type).join(', ')}. These pieces from your wardrobe would create a polished look.`;
    return "For formal events, I'd recommend investing in a well-fitted blazer and tailored trousers. Classic pieces that elevate any outfit.";
  }

  if (lower.includes('casual') || lower.includes('weekend') || lower.includes('relax')) {
    const items = wardrobe.filter(i => ['jeans', 'tshirt', 't-shirt', 'sneakers', 'casual'].some(w => i.type.toLowerCase().includes(w)));
    if (items.length > 0) return `For a casual look, try: ${items.slice(0, 3).map(i => i.type).join(', ')}. Comfortable yet stylish!`;
    return "For casual outings, a well-fitted pair of jeans with a quality tee and clean sneakers always works beautifully.";
  }

  if (lower.includes('date') || lower.includes('dinner') || lower.includes('party')) {
    return "For a special evening, I'd suggest something that makes you feel confident. A dress or a sharp outfit with accessories can make all the difference. Would you like me to pick something from your wardrobe?";
  }

  if (lower.includes('color') || lower.includes('match')) {
    return "Color harmony is key! Neutrals (black, white, beige) pair with everything. For bold looks, try complementary colors. Navy + white is always elegant, and earth tones create a sophisticated palette.";
  }

  if (lower.includes('weather') || lower.includes('cold') || lower.includes('hot') || lower.includes('rain')) {
    return "I adjust recommendations based on weather automatically! Check your home page for today's weather-appropriate outfits. Layering is great for unpredictable weather.";
  }

  if (lower.includes('help') || lower.includes('what can you do')) {
    return "I'm VÉRA, your AI styling assistant! I can help you with:\n• Outfit recommendations based on weather & events\n• Color matching advice\n• Wardrobe organization tips\n• Style suggestions for any occasion\n\nJust ask me anything about fashion!";
  }

  return "I'd love to help with your styling needs! Tell me about the occasion, weather, or style you're going for, and I'll create the perfect outfit suggestion for you.";
}
