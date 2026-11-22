import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  BackendImpact,
  BackendListing,
  BackendMatch,
  BackendOrganisation,
  BackendPickup,
  BackendStreamEvent,
  BackendUser,
  FoodListingExtraction,
  FoodCategory,
  AIProvider,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const MOCK_DELAY_MS = Number(import.meta.env.VITE_MOCK_DELAY_MS) || 500;
const ACCESS_TOKEN_KEY = 'surpluslink_access_token_v1';
export const DEMO_PASSWORD = 'surplus123';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function isMockMode(): boolean {
  return USE_MOCK_DATA;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unknown API error';
}

/**
 * Local AI extraction fallback engine.
 * Mirrors the Python Tier-3 heuristic parser in `ai_extraction.py`.
 */
export function mockLocalAiExtraction(text: string): FoodListingExtraction {
  const low = text.toLowerCase();

  const headSplit = text.split(/,|\b(?:pickup|pick up|collect|collection|before|by|till|until|upto|at|from)\b/i);
  let title: string | null = headSplit[0]?.trim() || null;
  if (title && title.length < 2) title = null;

  let category: FoodCategory | null = null;
  if (/rice|dal|curry|biryani|roti|chapati|sabzi|paneer|khichdi|raita|meal|plate|dinner|lunch|breakfast|sambar|pulao|noodles|pasta|pizza|soup/.test(low)) {
    category = 'Cooked Meals';
  } else if (/raw rice|uncooked|wheat|flour|atta|maida|grain|pulses|lentils|cereal|oats|dry ration/.test(low)) {
    category = 'Grains/Staples';
  } else if (/fruit|vegetable|veggies|banana|apple|tomato|potato|onion|produce|salad|greens|cabbage/.test(low)) {
    category = 'Produce';
  } else if (/bread|bun|cake|pastry|pastries|bakery|cookie|muffin|croissant|donut|biscuit/.test(low)) {
    category = 'Bakery';
  } else if (/milk|cheese|butter|yogurt|curd|cream|ghee/.test(low)) {
    category = 'Dairy';
  } else if (title) {
    category = 'Other';
  }

  let quantity: number | null = null;
  let unit: string | null = null;
  const kgMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|kilogram|kilograms)\b/);
  if (kgMatch) {
    quantity = parseFloat(kgMatch[1]);
    unit = 'kg';
  } else {
    const plateMatch = low.match(/(\d+)\s*(plates?|meals?|servings?|portions?|packets?|boxes?|trays?)\b/);
    if (plateMatch) {
      quantity = parseInt(plateMatch[1], 10);
      unit = plateMatch[2].endsWith('s') ? plateMatch[2] : `${plateMatch[2]}s`;
    }
  }

  let deadline: string | null = null;
  const timeMatch = text.match(/\b(?:before|by|till|until|upto|up to)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (timeMatch) deadline = timeMatch[1].trim();

  let pickupLocation: string | null = null;
  const placeMatch = text.match(/\b(?:from|at)\s+([A-Za-z0-9\s.'&-]+?)(?=\s+(?:before|by|till|until|upto|pickup|collect)\b|[,;.]|$)/i);
  if (placeMatch) pickupLocation = placeMatch[1].trim();

  const missing_fields: string[] = [];
  if (!title) missing_fields.push('title');
  if (!category || category === 'Other') missing_fields.push('category');
  if (quantity === null) missing_fields.push('quantity');
  if (!unit) missing_fields.push('unit');
  if (!deadline) missing_fields.push('deadline');
  if (!pickupLocation) missing_fields.push('pickup_location');

  const provider: AIProvider = USE_MOCK_DATA ? 'gemini' : 'local_fallback';
  return {
    title,
    category,
    quantity,
    unit,
    deadline,
    pickup_location: pickupLocation,
    missing_fields,
    provider_used: provider,
    requires_confirmation: true,
    raw_draft: text,
    warning: USE_MOCK_DATA ? null : 'Extracted via offline heuristic fallback engine',
  };
}

export async function checkBackendHealth(): Promise<{ status: string; service: string; isMock: boolean }> {
  if (USE_MOCK_DATA) {
    return {
      status: 'healthy',
      service: 'SurplusLink AI Mock Engine (Offline Mode)',
      isMock: true,
    };
  }

  try {
    const response = await apiClient.get('/health');
    return {
      status: response.data?.status || 'healthy',
      service: response.data?.service || 'SurplusLink AI Backend',
      isMock: false,
    };
  } catch (error) {
    console.warn('[SurplusLink API] Backend unreachable, falling back to mock engine.', error);
    return {
      status: 'mock_active',
      service: 'SurplusLink AI Client Fallback Engine',
      isMock: true,
    };
  }
}

export async function ensureDemoSeeded(): Promise<boolean> {
  if (USE_MOCK_DATA) return false;
  try {
    await apiClient.post('/api/demo/seed');
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) return true;
    console.warn('[SurplusLink API] Demo seed unavailable:', errorMessage(error));
    return false;
  }
}

export async function extractFoodListing(text: string): Promise<FoodListingExtraction> {
  if (!text || text.trim().length === 0) {
    throw new Error('Description text cannot be empty');
  }

  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return mockLocalAiExtraction(text);
  }

  try {
    const response = await apiClient.post<FoodListingExtraction>('/api/ai/extract', { text });
    return response.data;
  } catch (error) {
    console.warn('[SurplusLink API] /api/ai/extract failed, triggering client fallback:', errorMessage(error));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const fallback = mockLocalAiExtraction(text);
    fallback.provider_used = 'local_fallback';
    fallback.warning = 'Live backend unavailable. Extracted via local fallback engine.';
    return fallback;
  }
}

export async function loginWithBackend(
  email: string,
  password: string
): Promise<{ token: string; user: BackendUser }> {
  const response = await apiClient.post<{ access_token: string; user: BackendUser }>('/api/auth/login', {
    email: email.trim(),
    password,
  });
  setAccessToken(response.data.access_token);
  return { token: response.data.access_token, user: response.data.user };
}

export async function fetchCurrentUser(): Promise<BackendUser> {
  const response = await apiClient.get<BackendUser>('/api/auth/me');
  return response.data;
}

export async function fetchOrganisations(): Promise<BackendOrganisation[]> {
  const response = await apiClient.get<BackendOrganisation[]>('/api/organisations');
  return response.data;
}

export async function fetchUsers(): Promise<BackendUser[]> {
  const response = await apiClient.get<BackendUser[]>('/api/users');
  return response.data;
}

export async function fetchListings(): Promise<BackendListing[]> {
  const response = await apiClient.get<BackendListing[]>('/api/donations');
  return response.data;
}

export async function fetchPickups(): Promise<BackendPickup[]> {
  const response = await apiClient.get<BackendPickup[]>('/api/pickups');
  return response.data;
}

export async function fetchImpact(): Promise<BackendImpact> {
  const response = await apiClient.get<BackendImpact>('/api/dashboard/impact');
  return response.data;
}

export async function fetchMatchingSuggestions(foodListingId: number): Promise<BackendMatch[]> {
  const response = await apiClient.get<BackendMatch[]>('/api/matching/suggest', {
    params: { food_listing_id: foodListingId, limit: 10 },
  });
  return response.data;
}

export interface BackendListingCreate {
  title: string;
  raw_description: string;
  category: string;
  quantity: number;
  unit: string;
  available_until: string;
  pickup_venue: string;
  handling_notes?: string;
  missing_fields_flagged?: boolean;
}

export async function createBackendListing(payload: BackendListingCreate): Promise<BackendListing> {
  const response = await apiClient.post<BackendListing>('/api/donations', payload);
  return response.data;
}

export async function acceptBackendListing(listingId: number): Promise<{ listing: BackendListing; join_code: string }> {
  const response = await apiClient.post<{ listing: BackendListing; session: { join_code: string } | null }>(
    `/api/donations/${listingId}/accept`
  );
  return {
    listing: response.data.listing,
    join_code: response.data.session?.join_code || '',
  };
}

export async function startBackendPickup(
  listingId: number,
  volunteerName?: string
): Promise<{ pickup_id: number; rescue_session_id: number; join_code: string; status: string }> {
  const response = await apiClient.post('/api/pickups/start', {
    listing_id: listingId,
    volunteer_name: volunteerName,
  });
  return response.data;
}

export async function generateBackendQr(
  pickupId: number
): Promise<{ token: string; expires_at: string; qr_image: string; rescue_session_id: number | null }> {
  const response = await apiClient.post(`/api/pickups/${pickupId}/qr`);
  return response.data;
}

export async function verifyBackendHandover(
  pickupId: number,
  token: string
): Promise<{ message: string; verified_at: string }> {
  const response = await apiClient.post(`/api/pickups/${pickupId}/verify`, { token });
  return response.data;
}

export function connectDonationStream(
  token: string,
  onEvent: (event: BackendStreamEvent) => void
): () => void {
  if (USE_MOCK_DATA || !token) return () => undefined;
  const wsBase = API_BASE_URL
    ? API_BASE_URL.replace(/^http/, 'ws')
    : (typeof window !== 'undefined' ? window.location.origin.replace(/^http/, 'ws') : '');
  if (!wsBase) return () => undefined;
  try {
    const socket = new WebSocket(`${wsBase}/ws/donations?token=${encodeURIComponent(token)}`);
    socket.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data) as BackendStreamEvent);
      } catch (error) {
        console.warn('[SurplusLink WS] Invalid event payload', error);
      }
    };
    return () => socket.close();
  } catch (err) {
    console.warn('[SurplusLink WS] WebSocket connection error', err);
    return () => undefined;
  }
}
