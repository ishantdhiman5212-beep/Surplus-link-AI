import {
  ActivityFeedItem,
  BackendImpact,
  BackendListing,
  BackendMatch,
  BackendOrganisation,
  BackendPickup,
  BackendUser,
  FoodListing,
  ImpactStats,
  ListingStatus,
  NgoMatchScore,
} from '../types';
import { NGOS } from './mockData';

export interface DirectoryContext {
  users: BackendUser[];
  organisations: BackendOrganisation[];
  tokensByListingId?: Record<string, { token: string; codeAt: number; qrImage?: string }>;
}

function categoryToCode(category: string): FoodListing['cat'] {
  const value = category.toLowerCase();
  if (/bakery|bread|cake|bun|pastry/.test(value)) return 'bakery';
  if (/produce|fruit|vegetable|apple|banana|salad|greens/.test(value)) return 'produce';
  if (/packaged|dry|grain|rice|dal|staple|lentil|cereal/.test(value)) return 'packaged';
  if (/cooked|meal|plate|curry|biryani|kitchen|food|surplus/.test(value)) return 'cooked';
  return 'other';
}

function statusToFrontend(status: string): ListingStatus {
  switch (status.toLowerCase()) {
    case 'listed':
      return 'open';
    case 'accepted':
    case 'ngo_accepted':
      return 'accepted';
    case 'pickup_assigned':
    case 'in_transit':
    case 'transit':
      return 'transit';
    case 'collected':
    case 'verified':
      return 'collected';
    case 'expired':
      return 'expired';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'open';
  }
}

function deadlineFromIso(value: string): number {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function ngoIdForUser(userId: number | null, context: DirectoryContext): string | undefined {
  if (!userId) return undefined;
  const user = context.users.find((item) => item.id === userId);
  if (!user?.organisation_id) return undefined;
  const org = context.organisations.find((item) => item.id === user.organisation_id);
  if (!org) return undefined;
  const match = Object.entries(NGOS).find(([, ngo]) => ngo.name === org.name);
  return match?.[0];
}

export function toFrontendListing(
  listing: BackendListing,
  context: DirectoryContext
): FoodListing {
  const donor = context.users.find((item) => item.id === listing.donor_user_id);
  const token = context.tokensByListingId?.[String(listing.id)];
  return {
    id: String(listing.id),
    title: listing.title,
    donor: donor?.name || `Donor #${listing.donor_user_id}`,
    place: listing.pickup_venue,
    kg: listing.quantity,
    cat: categoryToCode(listing.category),
    categoryLabel: listing.category,
    deadline: deadlineFromIso(listing.available_until),
    deadlineFormatted: new Date(listing.available_until).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: statusToFrontend(listing.status),
    ngo: ngoIdForUser(listing.accepted_ngo_id, context),
    code: token?.token ?? null,
    codeAt: token?.codeAt ?? null,
    qrImage: token?.qrImage ?? null,
    createdAt: new Date(listing.created_at).getTime(),
    rawDraft: listing.raw_description,
    rescueSessionId: listing.rescue_session_id ? String(listing.rescue_session_id) : undefined,
  };
}

export function toFrontendListings(
  listings: BackendListing[],
  context: DirectoryContext
): FoodListing[] {
  return listings.map((listing) => toFrontendListing(listing, context));
}

export function toFrontendMatch(match: BackendMatch): NgoMatchScore {
  const org = match.organisation;
  const frontendId = Object.entries(NGOS).find(([, ngo]) => ngo.name === org.name)?.[0] || String(org.id);
  const rejected = !match.isEligible;
  return {
    id: frontendId,
    name: org.name,
    ok: match.isEligible,
    score: Math.round(match.score.totalScore),
    tags: match.explanation.tags,
    why: rejected ? match.explanation.operationalNote || 'Not eligible' : match.explanation.headline,
    d: match.score.distanceKm,
  };
}

export function toImpactStats(impact: BackendImpact, listings: FoodListing[]): ImpactStats {
  const collected = listings.filter((item) => item.status === 'collected');
  const rescuedKg = impact.rescued_quantity || collected.reduce((sum, item) => sum + item.kg, 0);
  return {
    rescuedKg,
    mealsShared: Math.round(rescuedKg * 2.5),
    co2AvoidedKg: Math.round(rescuedKg * 2.5),
    totalDonations: impact.listings_created || listings.length,
    activeOpen: listings.filter((item) => item.status === 'open').length,
    inTransit: listings.filter((item) => item.status === 'transit').length,
    completed: impact.handovers_completed || collected.length,
    demoGoalKg: 50,
  };
}

export function buildFeed(listings: FoodListing[]): ActivityFeedItem[] {
  return [...listings]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
    .map((listing) => {
      let category: ActivityFeedItem['category'] = 'listing';
      let text = `${listing.donor} listed ${listing.title}`;
      if (listing.status === 'accepted') {
        category = 'accept';
        text = `${listing.donor}'s ${listing.title} was accepted for pickup`;
      } else if (listing.status === 'transit') {
        category = 'pickup';
        text = `Volunteer started pickup of ${listing.title} from ${listing.donor}`;
      } else if (listing.status === 'collected') {
        category = 'handover';
        text = `Handover verified for ${listing.title} from ${listing.donor}`;
      }
      return {
        id: `be_${listing.id}_${listing.status}`,
        t: listing.createdAt,
        text,
        category,
      };
    });
}

export function pickupIdForListing(
  pickups: BackendPickup[],
  listingId: string
): number | undefined {
  return pickups.find((pickup) => String(pickup.listing_id) === listingId)?.pickup_id;
}

export function organisationKeyForUser(
  user: BackendUser,
  organisations: BackendOrganisation[]
): string | undefined {
  if (!user.organisation_id) return undefined;
  const org = organisations.find((item) => item.id === user.organisation_id);
  if (!org) return undefined;
  return Object.entries(NGOS).find(([, ngo]) => ngo.name === org.name)?.[0];
}
