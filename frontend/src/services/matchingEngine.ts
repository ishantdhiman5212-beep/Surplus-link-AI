import { FoodListing, NgoMatchScore } from '../types';
import { NGOS, CATEGORIES } from './mockData';

const BASE_DISTANCES: Record<string, number> = {
  roti: 2.4,
  sewa: 1.3,
  anna: 3.4,
};

function stringHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function currentMinutesFromMidnight(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function getMinutesLeft(deadlineMinutes: number): number {
  let left = deadlineMinutes - currentMinutesFromMidnight();
  if (left < 0) left += 1440; // Next day loop
  return left;
}

export function formatMinutesLeft(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function formatTimeHHMM(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60) % 24;
  const m = minutesFromMidnight % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateDistance(listing: FoodListing, ngoId: string): number {
  const base = BASE_DISTANCES[ngoId] ?? 2.0;
  const variance = (stringHash(listing.donor + ngoId) % 100) / 110;
  return +(0.5 + base * (0.55 + variance)).toFixed(1);
}

export function scoreNgoForListing(listing: FoodListing, ngoId: string): NgoMatchScore {
  const ngo = NGOS[ngoId];
  if (!ngo) {
    return {
      id: ngoId,
      name: 'Unknown NGO',
      ok: false,
      score: 0,
      tags: [],
      why: 'NGO record not found',
      d: 99,
    };
  }

  // 1. Dietary acceptance check
  if (!ngo.takes.includes(listing.cat)) {
    const catLabel = CATEGORIES[listing.cat]?.plural || listing.cat;
    return {
      id: ngoId,
      name: ngo.name,
      ok: false,
      score: 0,
      tags: [],
      why: `Does not accept ${catLabel}`,
      d: calculateDistance(listing, ngoId),
    };
  }

  // 2. Capacity constraint check
  if (listing.kg > ngo.cap) {
    return {
      id: ngoId,
      name: ngo.name,
      ok: false,
      score: 0,
      tags: [],
      why: `Over capacity (${ngo.cap} kg maximum limit)`,
      d: calculateDistance(listing, ngoId),
    };
  }

  // 3. Deadline ETA reachability check
  const d = calculateDistance(listing, ngoId);
  const etaMinutes = Math.round(d * 5 + 15);
  const left = getMinutesLeft(listing.deadline);

  if (left < etaMinutes) {
    return {
      id: ngoId,
      name: ngo.name,
      ok: false,
      score: 0,
      tags: [],
      why: 'Transit ETA exceeds deadline',
      d,
    };
  }

  // Multi-factor weighted score (0 - 100)
  // Proximity (38%)
  const proximityFactor = Math.min(1, Math.max(0, 1 - d / 9));
  
  // Capacity fit (22%)
  const utilization = listing.kg / ngo.cap;
  const capacityFactor = utilization > 0.85 ? 0.7 : 0.55 + 0.45 * Math.min(utilization / 0.6, 1);
  
  // Time urgency buffer (25%)
  const timeFactor = Math.min(1, Math.max(0, (Math.min(left, 240) - etaMinutes) / 150));
  
  // Category specialty match (15%)
  const categoryBonus = ngo.best.includes(listing.cat) ? 1.0 : 0.75;

  const totalScore = Math.round(
    100 * (0.38 * proximityFactor + 0.22 * capacityFactor + 0.25 * timeFactor + 0.15 * categoryBonus)
  );

  const tags: string[] = [
    d <= 2.5 ? 'Nearby (< 2.5km)' : d <= 4 ? 'Close by' : 'Medium radius',
    utilization > 0.85 ? 'High capacity use' : utilization >= 0.2 ? 'Optimal batch size' : 'Plenty of room',
    timeFactor >= 0.5 ? 'Prompt pickup window' : 'Tight schedule',
    `Accepts ${CATEGORIES[listing.cat]?.plural || listing.cat}`,
  ];

  return {
    id: ngoId,
    name: ngo.name,
    ok: true,
    score: totalScore,
    tags,
    d,
  };
}

export function rankNgosForListing(listing: FoodListing): NgoMatchScore[] {
  return Object.keys(NGOS)
    .map((id) => scoreNgoForListing(listing, id))
    .sort((a, b) => {
      if (a.ok !== b.ok) return a.ok ? -1 : 1;
      return b.score - a.score;
    });
}
