/**
 * SurplusLink AI - Central Domain Types & API Contracts
 * Mirrors the unified FastAPI backend contracts and React UI domain model
 */

export type AIProvider = 'gemini' | 'openai' | 'grok' | 'local_fallback';

export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  organisationId?: string;
  organisationName?: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  role: UserRole;
  organisationId?: string;
}

export type FoodCategory = 
  | 'Cooked Meals' 
  | 'Grains/Staples' 
  | 'Produce' 
  | 'Bakery' 
  | 'Dairy' 
  | 'Other';

export type ListingStatus = 
  | 'open' 
  | 'accepted' 
  | 'transit' 
  | 'collected' 
  | 'expired' 
  | 'cancelled';

export interface ExtractionRequest {
  text: string;
}

export interface FoodListingExtraction {
  title: string | null;
  category: FoodCategory | string | null;
  quantity: number | null;
  unit: string | null;
  deadline: string | null;
  pickup_location: string | null;
  missing_fields: string[];
  provider_used: AIProvider;
  requires_confirmation: boolean;
  raw_draft: string;
  warning: string | null;
}

export interface FoodListing {
  id: string;
  title: string;
  donor: string;
  place: string;
  kg: number;
  cat: 'cooked' | 'bakery' | 'produce' | 'packaged' | 'other';
  categoryLabel?: string;
  deadline: number; // minutes from midnight (e.g. 18*60 = 1080 for 18:00)
  deadlineFormatted?: string;
  status: ListingStatus;
  ngo?: string;
  code?: string | null;
  codeAt?: number | null; // timestamp when code was generated
  qrImage?: string | null; // data URL for the volunteer handover QR
  createdAt: number;
  rawDraft?: string;
  rescueSessionId?: string;
}

export interface NgoOrganization {
  id: string;
  name: string;
  cap: number; // max kg capacity
  takes: Array<'cooked' | 'bakery' | 'produce' | 'packaged' | 'other'>;
  best: Array<'cooked' | 'bakery' | 'produce' | 'packaged' | 'other'>;
  location?: string;
  avatar?: string;
}

export interface NgoMatchScore {
  id: string;
  name: string;
  ok: boolean;
  score: number; // 0 - 100
  tags: string[];
  why?: string;
  d: number; // distance in km
}

export interface RescueSession {
  id: string;
  joinCode: string; // e.g. "RESCUE-7QK2" or "7QK29M"
  foodListingId?: string;
  hostDonorId?: string;
  status: 'active' | 'completed' | 'expired';
  createdAt: number;
  participantsCount?: number;
}

export interface RescueStreamEvent {
  eventType: 
    | 'donationCreated' 
    | 'donationAccepted' 
    | 'volunteerAssigned' 
    | 'pickupStatusChanged' 
    | 'handoverVerified'
    | 'joinCodeUpdated';
  listingId?: string;
  joinCode?: string;
  status?: ListingStatus;
  actorRole: 'donor' | 'ngo' | 'volunteer' | 'system';
  actorName?: string;
  message: string;
  timestamp: number;
}

export interface ActivityFeedItem {
  id: string;
  t: number;
  text: string;
  category?: 'listing' | 'accept' | 'pickup' | 'handover';
}

export interface ImpactStats {
  rescuedKg: number;
  mealsShared: number;
  co2AvoidedKg: number;
  totalDonations: number;
  activeOpen: number;
  inTransit: number;
  completed: number;
  demoGoalKg: number;
}

/** Backend contracts returned by the FastAPI service. */
export interface BackendUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  organisation_id: number | null;
  created_at: string;
}

export interface BackendOrganisation {
  id: number;
  name: string;
  type: string;
  max_capacity_meals: number;
  service_area_km: number;
  latitude: number;
  longitude: number;
  address: string;
  operating_hours_start: string;
  operating_hours_end: string;
  accepted_categories: string;
  is_verified: boolean;
}

export interface BackendListing {
  id: number;
  donor_user_id: number;
  organisation_id: number | null;
  title: string;
  raw_description: string;
  category: string;
  quantity: number;
  unit: string;
  available_until: string;
  pickup_venue: string;
  latitude: number | null;
  longitude: number | null;
  handling_notes: string | null;
  missing_fields_flagged: boolean;
  status: string;
  accepted_ngo_id: number | null;
  rescue_session_id: number | null;
  created_at: string;
}

export interface BackendPickup {
  pickup_id: number;
  pickup_status: string;
  scheduled_at: string;
  listing_id: number;
  title: string | null;
  quantity: number | null;
  unit: string | null;
  pickup_location: string | null;
  deadline: string | null;
  recipient_name: string | null;
  rescue_session_id: number;
}

export interface BackendImpact {
  listings_created: number;
  pickups_accepted: number;
  handovers_completed: number;
  rescued_quantity: number;
  map_pins: Array<Record<string, unknown>>;
}

export interface BackendMatch {
  organisation: {
    id: number;
    name: string;
    type: string;
    capacity: number;
    latitude: number;
    longitude: number;
    serviceRadiusKm: number;
    operatingHoursStart: string | null;
    operatingHoursEnd: string | null;
    acceptedCategories: string[];
    reliabilityRating: number;
  };
  score: {
    totalScore: number;
    proximityScore: number;
    timingScore: number;
    capacityScore: number;
    categoryScore: number;
    reliabilityBonus: number;
    distanceKm: number;
    timeUntilDeadlineMinutes: number;
  };
  explanation: {
    headline: string;
    tags: string[];
    keyStrengths: string[];
    operationalNote: string | null;
  };
  rank: number;
  isEligible: boolean;
}

export interface BackendStreamEvent {
  event_type: string;
  rescue_session_id: number;
  food_listing_id: number | null;
  join_code: string | null;
  status: string;
  actor_user_id: number | null;
  actor_role: string | null;
  message: string;
  timestamp: string;
}
