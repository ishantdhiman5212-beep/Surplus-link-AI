import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActivityFeedItem,
  BackendImpact,
  BackendListing,
  BackendOrganisation,
  BackendPickup,
  BackendUser,
  FoodListing,
  ImpactStats,
  ListingStatus,
} from '../types';
import { INITIAL_LISTINGS, INITIAL_FEED, NGOS } from '../services/mockData';
import { syncManager } from '../services/syncService';
import {
  acceptBackendListing,
  checkBackendHealth,
  connectDonationStream,
  createBackendListing,
  ensureDemoSeeded,
  fetchImpact,
  fetchListings,
  fetchOrganisations,
  fetchPickups,
  fetchUsers,
  generateBackendQr,
  getAccessToken,
  isMockMode,
  startBackendPickup,
  verifyBackendHandover,
} from '../services/api';
import {
  buildFeed,
  pickupIdForListing,
  toFrontendListings,
  toImpactStats,
} from '../services/adapters';

const STORAGE_KEY = 'surpluslink_data_v1';
const TOKEN_STORAGE_KEY = 'surpluslink_handover_tokens_v1';
const JOIN_CODE_DEFAULT = import.meta.env.VITE_DEFAULT_JOIN_CODE || 'RESCUE-7QK2';

type HandoverTokens = Record<string, { token: string; codeAt: number; qrImage?: string }>;

interface RescueContextType {
  listings: FoodListing[];
  feed: ActivityFeedItem[];
  joinCode: string;
  activeNgo: string;
  declinedListings: Record<string, string[]>;
  usedCodes: string[];
  stats: ImpactStats;
  isBackendLive: boolean;
  backendInfo: { status: string; service: string; isMock: boolean } | null;
  addListing: (listingData: Omit<FoodListing, 'id' | 'createdAt' | 'status'>) => Promise<FoodListing>;
  acceptListing: (listingId: string, ngoId: string) => Promise<void>;
  declineListing: (listingId: string, ngoId: string) => void;
  startPickup: (listingId: string) => Promise<string>;
  regenerateCode: (listingId: string) => Promise<string>;
  verifyHandoverCode: (code: string, ngoId: string) => Promise<{ success: boolean; message: string; listing?: FoodListing }>;
  setActiveNgo: (id: string) => void;
  setJoinCode: (code: string) => void;
  resetDemoData: () => void;
}

const RescueContext = createContext<RescueContextType | undefined>(undefined);

function loadTokens(): HandoverTokens {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function defaultStats(listings: FoodListing[]): ImpactStats {
  const collected = listings.filter((item) => item.status === 'collected');
  const rescuedKg = collected.reduce((sum, item) => sum + (item.kg || 0), 0);
  return {
    rescuedKg,
    mealsShared: Math.round(rescuedKg * 2.5),
    co2AvoidedKg: Math.round(rescuedKg * 2.5),
    totalDonations: listings.length,
    activeOpen: listings.filter((item) => item.status === 'open').length,
    inTransit: listings.filter((item) => item.status === 'transit').length,
    completed: collected.length,
    demoGoalKg: 50,
  };
}

function deadlineToIso(deadlineMinutes: number): string {
  const date = new Date();
  const hours = Math.floor(deadlineMinutes / 60) % 24;
  const minutes = deadlineMinutes % 60;
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export const RescueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listings, setListings] = useState<FoodListing[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}_listings`);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fall back to seeded demo state.
      }
    }
    return INITIAL_LISTINGS;
  });

  const [feed, setFeed] = useState<ActivityFeedItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}_feed`);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fall back to seeded demo state.
      }
    }
    return INITIAL_FEED;
  });

  const [joinCode, setJoinCodeState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${STORAGE_KEY}_code`) || JOIN_CODE_DEFAULT;
    }
    return JOIN_CODE_DEFAULT;
  });

  const [activeNgo, setActiveNgoState] = useState<string>('roti');
  const [declinedListings, setDeclinedListings] = useState<Record<string, string[]>>({});
  const [usedCodes, setUsedCodes] = useState<string[]>([]);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);
  const [backendInfo, setBackendInfo] = useState<{ status: string; service: string; isMock: boolean } | null>(null);
  const [directory, setDirectory] = useState<{ users: BackendUser[]; organisations: BackendOrganisation[] }>({
    users: [],
    organisations: [],
  });
  const [pickups, setPickups] = useState<BackendPickup[]>([]);
  const [impact, setImpact] = useState<BackendImpact | null>(null);
  const [tokens, setTokens] = useState<HandoverTokens>(loadTokens);

  const tokensRef = useRef(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // Storage quota guard.
    }
  }, [tokens]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_listings`, JSON.stringify(listings));
      localStorage.setItem(`${STORAGE_KEY}_feed`, JSON.stringify(feed));
      localStorage.setItem(`${STORAGE_KEY}_code`, joinCode);
    } catch {
      // Storage quota guard.
    }
  }, [listings, feed, joinCode]);

  const applyBackendData = useCallback(
    (
      rawListings: BackendListing[],
      nextPickups: BackendPickup[],
      nextImpact: BackendImpact,
      nextDirectory: { users: BackendUser[]; organisations: BackendOrganisation[] }
    ) => {
      const mapped = toFrontendListings(rawListings, {
        users: nextDirectory.users,
        organisations: nextDirectory.organisations,
        tokensByListingId: tokensRef.current,
      });
      setListings(mapped);
      setFeed(buildFeed(mapped));
      setPickups(nextPickups);
      setImpact(nextImpact);
    },
    []
  );

  const refreshFromBackend = useCallback(async () => {
    if (isMockMode()) return;
    const [organisations, users, rawListings, nextPickups, nextImpact] = await Promise.all([
      fetchOrganisations(),
      fetchUsers(),
      fetchListings(),
      fetchPickups(),
      fetchImpact(),
    ]);
    const nextDirectory = { users, organisations };
    setDirectory(nextDirectory);
    applyBackendData(rawListings, nextPickups, nextImpact, nextDirectory);
  }, [applyBackendData]);

  const bootstrap = useCallback(async () => {
    const health = await checkBackendHealth();
    setBackendInfo(health);
    setIsBackendLive(!health.isMock);
    if (health.isMock) {
      return;
    }
    await ensureDemoSeeded();
    await refreshFromBackend();
  }, [refreshFromBackend]);

  useEffect(() => {
    bootstrap().catch((error) => {
      console.warn('[SurplusLink] Initial backend sync failed:', error);
      setIsBackendLive(false);
    });
    // Only run once on mount; explicit refresh handlers cover later updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!isBackendLive || !token) return;
    return connectDonationStream(token, () => {
      refreshFromBackend().catch(() => undefined);
    });
  }, [isBackendLive, refreshFromBackend]);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(() => {
      if (isMockMode()) {
        try {
          const savedListings = localStorage.getItem(`${STORAGE_KEY}_listings`);
          const savedFeed = localStorage.getItem(`${STORAGE_KEY}_feed`);
          if (savedListings) setListings(JSON.parse(savedListings));
          if (savedFeed) setFeed(JSON.parse(savedFeed));
        } catch {
          // Sync safeguard.
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const logActivity = useCallback((text: string, category: ActivityFeedItem['category'] = 'listing') => {
    const item: ActivityFeedItem = {
      id: 'f_' + Date.now().toString(36),
      t: Date.now(),
      text,
      category,
    };
    setFeed((prev) => [item, ...prev].slice(0, 20));
  }, []);

  const generateCode = useCallback((): string => {
    let code: string;
    let attempts = 0;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
      attempts++;
    } while ((usedCodes.includes(code) || listings.some((listing) => listing.code === code)) && attempts < 50);
    return code;
  }, [usedCodes, listings]);

  const saveToken = useCallback((listingId: string, token: string, expiresAt?: string, qrImage?: string) => {
    const codeAt = expiresAt ? Date.parse(expiresAt) - 2 * 60 * 60 * 1000 : Date.now();
    setTokens((prev) => ({
      ...prev,
      [listingId]: {
        token,
        codeAt: Number.isFinite(codeAt) ? codeAt : Date.now(),
        qrImage,
      },
    }));
  }, []);

  const addListing = useCallback(
    async (listingData: Omit<FoodListing, 'id' | 'createdAt' | 'status'>): Promise<FoodListing> => {
      if (isMockMode() || !isBackendLive || !getAccessToken()) {
        const newListing: FoodListing = {
          ...listingData,
          id: 'l_' + Date.now().toString(36),
          status: 'open',
          createdAt: Date.now(),
        };
        setListings((prev) => [newListing, ...prev]);
        logActivity(`${newListing.donor} listed ${newListing.title}`, 'listing');
        syncManager.broadcast({
          eventType: 'donationCreated',
          listingId: newListing.id,
          actorRole: 'donor',
          message: `${newListing.donor} posted new surplus food listing`,
          timestamp: Date.now(),
        });
        return newListing;
      }

      const created = await createBackendListing({
        title: listingData.title,
        raw_description: listingData.rawDraft || listingData.title,
        category: listingData.categoryLabel || listingData.cat,
        quantity: Math.max(1, Math.round(listingData.kg || 1)),
        unit: 'kg',
        available_until: deadlineToIso(listingData.deadline),
        pickup_venue: listingData.place,
        handling_notes: 'Please verify freshness and packaging at handover.',
      });
      await refreshFromBackend();
      const mapped = toFrontendListings([created], {
        users: directory.users,
        organisations: directory.organisations,
        tokensByListingId: tokensRef.current,
      })[0];
      logActivity(`${mapped.donor} listed ${mapped.title}`, 'listing');
      return mapped;
    },
    [directory, isBackendLive, logActivity, refreshFromBackend]
  );

  const acceptListing = useCallback(
    async (listingId: string, ngoId: string): Promise<void> => {
      const target = listings.find((listing) => listing.id === listingId);
      const ngoName = NGOS[ngoId]?.name || 'NGO';

      if (isMockMode() || !isBackendLive || !getAccessToken()) {
        setListings((prev) =>
          prev.map((listing) =>
            listing.id === listingId ? { ...listing, status: 'accepted' as ListingStatus, ngo: ngoId } : listing
          )
        );
        if (target) logActivity(`${ngoName} accepted ${target.kg} kg from ${target.donor}`, 'accept');
        return;
      }

      const result = await acceptBackendListing(Number(listingId));
      if (result.join_code) setJoinCodeState(result.join_code);
      await refreshFromBackend();
      if (target) logActivity(`${ngoName} accepted ${target.kg} kg from ${target.donor}`, 'accept');
      syncManager.broadcast({
        eventType: 'donationAccepted',
        listingId,
        actorRole: 'ngo',
        actorName: ngoName,
        message: `${ngoName} accepted donation`,
        timestamp: Date.now(),
      });
    },
    [isBackendLive, listings, logActivity, refreshFromBackend]
  );

  const declineListing = useCallback((listingId: string, ngoId: string) => {
    setDeclinedListings((prev) => ({
      ...prev,
      [listingId]: [...(prev[listingId] || []), ngoId],
    }));
  }, []);

  const startPickup = useCallback(
    async (listingId: string): Promise<string> => {
      const target = listings.find((listing) => listing.id === listingId);
      if (isMockMode() || !isBackendLive || !getAccessToken()) {
        const code = generateCode();
        const now = Date.now();
        setListings((prev) =>
          prev.map((listing) =>
            listing.id === listingId ? { ...listing, status: 'transit', code, codeAt: now } : listing
          )
        );
        if (target) logActivity(`Volunteer started pickup of ${target.kg} kg from ${target.donor}`, 'pickup');
        return code;
      }

      const started = await startBackendPickup(Number(listingId));
      const qr = await generateBackendQr(started.pickup_id);
      saveToken(listingId, qr.token, qr.expires_at, qr.qr_image);
      if (started.join_code) setJoinCodeState(started.join_code);
      await refreshFromBackend();
      if (target) logActivity(`Volunteer started pickup of ${target.kg} kg from ${target.donor}`, 'pickup');
      return qr.token;
    },
    [generateCode, isBackendLive, listings, logActivity, refreshFromBackend, saveToken]
  );

  const regenerateCode = useCallback(
    async (listingId: string): Promise<string> => {
      if (isMockMode() || !isBackendLive || !getAccessToken()) {
        const target = listings.find((listing) => listing.id === listingId);
        if (target?.code) setUsedCodes((prev) => [...prev, target.code!]);
        const newCode = generateCode();
        const now = Date.now();
        setListings((prev) =>
          prev.map((listing) => (listing.id === listingId ? { ...listing, code: newCode, codeAt: now } : listing))
        );
        return newCode;
      }

      let pickupId = pickupIdForListing(pickups, listingId);
      if (!pickupId) {
        const latest = await fetchPickups();
        setPickups(latest);
        pickupId = pickupIdForListing(latest, listingId);
      }
      if (!pickupId) throw new Error('No volunteer pickup exists for this listing yet.');
      const qr = await generateBackendQr(pickupId);
      saveToken(listingId, qr.token, qr.expires_at, qr.qr_image);
      await refreshFromBackend();
      return qr.token;
    },
    [generateCode, isBackendLive, listings, pickups, refreshFromBackend, saveToken]
  );

  const verifyHandoverCode = useCallback(
    async (code: string, ngoId: string) => {
      const cleanCode = code.trim().toUpperCase();
      const target = listings.find((listing) => listing.id === cleanCode) || listings.find((listing) => listing.code === cleanCode);

      // 1. Check if the code has already been verified
      if (usedCodes.includes(cleanCode)) {
        return { success: false, message: 'This handover code has already been verified and collected.' };
      }

      // 2. Check local mock/demo listings (both by code and id)
      let localListing = listings.find(
        (item) => item.code === cleanCode && (item.status === 'transit' || item.status === 'accepted')
      );
      if (!localListing) {
        localListing = listings.find((item) => item.code === cleanCode);
      }

      if (localListing) {
        if (localListing.status === 'collected') {
          return { success: false, message: 'This donation has already been verified and collected.' };
        }
        if (localListing.codeAt && Date.now() - localListing.codeAt > 7200000) {
          return { success: false, message: 'This handover code has expired (>2 hours). Request a new one.' };
        }

        // Auto-switch active NGO to the listing's assigned NGO if it differs
        if (localListing.ngo && localListing.ngo !== ngoId) {
          setActiveNgoState(localListing.ngo);
        }

        setUsedCodes((prev) => [...prev, cleanCode]);
        setListings((prev) =>
          prev.map((item) => (item.id === localListing.id ? { ...item, status: 'collected', code: null } : item))
        );

        const targetNgoKey = localListing.ngo || ngoId;
        const ngoName = (targetNgoKey && NGOS[targetNgoKey]?.name) || 'recipient NGO';
        logActivity(`Handover confirmed for ${localListing.title} at ${ngoName}`, 'handover');
        return {
          success: true,
          message: `Handover confirmed for "${localListing.title}" at ${ngoName}! Food custody verified.`,
          listing: localListing,
        };
      }

      // 3. Fallback check for unauthenticated / mock mode
      if (isMockMode() || !isBackendLive || !getAccessToken()) {
        if (cleanCode.length !== 6 && !cleanCode.startsWith('SL-')) {
          return { success: false, message: 'Enter the full one-time handover token.' };
        }
        return { success: false, message: 'Token not recognized. Double-check the token and try again.' };
      }

      // 4. Backend verification for live SL-<id>-<token> format
      const pickupMatch = cleanCode.match(/^SL-(\d+)-/);
      if (!pickupMatch) {
        return { success: false, message: 'Invalid handover token format. Enter 6-digit code or SL-<id>-<token>.' };
      }
      const pickupId = Number(pickupMatch[1]);
      const pickup = pickups.find((item) => item.pickup_id === pickupId);
      const listingForPickup = pickup
        ? listings.find((item) => item.id === String(pickup.listing_id))
        : undefined;

      if (listingForPickup?.ngo && listingForPickup.ngo !== ngoId) {
        setActiveNgoState(listingForPickup.ngo);
      }

      try {
        const result = await verifyBackendHandover(pickupId, cleanCode);
        setTokens((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            if (next[key].token === cleanCode) delete next[key];
          });
          return next;
        });
        await refreshFromBackend();
        logActivity(result.message, 'handover');
        return {
          success: true,
          message: result.message,
          listing: listingForPickup || target,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Handover verification failed.';
        return { success: false, message };
      }
    },
    [isBackendLive, listings, logActivity, pickups, refreshFromBackend, usedCodes]
  );

  const resetDemoData = useCallback(() => {
    setListings(INITIAL_LISTINGS);
    setFeed(INITIAL_FEED);
    setUsedCodes([]);
    setDeclinedListings({});
    setJoinCodeState(JOIN_CODE_DEFAULT);
    setTokens({});
    localStorage.removeItem(`${STORAGE_KEY}_listings`);
    localStorage.removeItem(`${STORAGE_KEY}_feed`);
    localStorage.removeItem(`${STORAGE_KEY}_code`);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const setActiveNgo = useCallback((id: string) => {
    setActiveNgoState(id);
  }, []);

  const setJoinCode = useCallback((code: string) => {
    setJoinCodeState(code);
  }, []);

  const computedStats = useMemo(
    () => (isBackendLive && impact ? toImpactStats(impact, listings) : defaultStats(listings)),
    [impact, isBackendLive, listings]
  );

  return (
    <RescueContext.Provider
      value={{
        listings,
        feed,
        joinCode,
        activeNgo,
        declinedListings,
        usedCodes,
        stats: computedStats,
        isBackendLive,
        backendInfo,
        addListing,
        acceptListing,
        declineListing,
        startPickup,
        regenerateCode,
        verifyHandoverCode,
        setActiveNgo,
        setJoinCode,
        resetDemoData,
      }}
    >
      {children}
    </RescueContext.Provider>
  );
};

export const useRescue = (): RescueContextType => {
  const context = useContext(RescueContext);
  if (!context) {
    throw new Error('useRescue must be used within a RescueProvider');
  }
  return context;
};
