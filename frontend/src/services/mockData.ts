import { FoodListing, NgoOrganization, ActivityFeedItem, User } from '../types';

export const NGOS: Record<string, NgoOrganization> = {
  roti: {
    id: 'roti',
    name: 'Roti Bank Foundation',
    cap: 60,
    takes: ['cooked', 'bakery', 'produce', 'packaged', 'other'],
    best: ['cooked', 'bakery'],
    location: 'Central Distribution Hub, Sector 14',
    avatar: '🍲',
  },
  sewa: {
    id: 'sewa',
    name: 'Sewa Community Kitchen',
    cap: 45,
    takes: ['cooked', 'bakery', 'produce', 'other'],
    best: ['cooked'],
    location: 'Community Center, MG Road',
    avatar: '🥣',
  },
  anna: {
    id: 'anna',
    name: 'Annapurna Shelter Home',
    cap: 25,
    takes: ['cooked', 'packaged'],
    best: ['packaged', 'cooked'],
    location: 'North Shelter Complex, Gate 3',
    avatar: '🏡',
  },
};

export const PRESET_USERS: Record<string, User> = {
  // 1. NGO Users
  ngo_roti: {
    id: 'u_ngo_roti',
    name: 'Roti Bank Dispatch Lead',
    email: 'roti@rotibank.org',
    role: 'ngo',
    organisationId: 'roti',
    organisationName: 'Roti Bank Foundation',
    phone: '+91 98765 43210',
    avatar: '🍲',
  },
  ngo_sewa: {
    id: 'u_ngo_sewa',
    name: 'Sewa Kitchen Coordinator',
    email: 'sewa@kitchen.org',
    role: 'ngo',
    organisationId: 'sewa',
    organisationName: 'Sewa Community Kitchen',
    phone: '+91 98111 22334',
    avatar: '🥣',
  },
  ngo_anna: {
    id: 'u_ngo_anna',
    name: 'Annapurna Shelter Lead',
    email: 'anna@shelter.org',
    role: 'ngo',
    organisationId: 'anna',
    organisationName: 'Annapurna Shelter Home',
    phone: '+91 98222 33445',
    avatar: '🏡',
  },

  // 2. Volunteer Users
  vol_arjun: {
    id: 'u_vol_arjun',
    name: 'Arjun Verma (Rider #42)',
    email: 'rider.arjun@surpluslink.org',
    role: 'volunteer',
    phone: '+91 98450 11223',
    avatar: '🛵',
  },
  vol_priya: {
    id: 'u_vol_priya',
    name: 'Priya Sharma (Cargo Runner)',
    email: 'priya.rider@surpluslink.org',
    role: 'volunteer',
    phone: '+91 98711 55667',
    avatar: '🚴',
  },

  // 3. Admin User
  admin_lead: {
    id: 'u_admin_lead',
    name: 'Platform Dispatch Admin',
    email: 'admin@surpluslink.ai',
    role: 'admin',
    phone: '+91 99999 88888',
    avatar: '🛡️',
  },

  // 4. Food Donor User
  donor_spice: {
    id: 'u_donor_spice',
    name: 'Spice Route Head Chef',
    email: 'chef@spiceroute.com',
    role: 'donor',
    organisationName: 'Spice Route Restaurant',
    phone: '+91 97654 32109',
    avatar: '👨‍🍳',
  },
};

export const CATEGORIES = {
  cooked: { label: 'Cooked Meals', plural: 'cooked meals', icon: '🍲' },
  bakery: { label: 'Bakery', plural: 'bakery items', icon: '🥐' },
  produce: { label: 'Fresh Produce', plural: 'fresh produce', icon: '🥗' },
  packaged: { label: 'Packaged Food', plural: 'packaged food', icon: '📦' },
  other: { label: 'Other / Mixed', plural: 'mixed food', icon: '🍱' },
};

export const INITIAL_LISTINGS: FoodListing[] = [
  {
    id: 'l1',
    title: '40 plates veg biryani & cucumber raita',
    donor: 'Spice Route Restaurant',
    place: 'MG Road, Metro Pillar 42',
    kg: 16,
    cat: 'cooked',
    categoryLabel: 'Cooked Meals',
    deadline: 21 * 60, // 21:00 (9:00 PM)
    status: 'open',
    createdAt: Date.now() - 25 * 60 * 1000,
    rawDraft: '40 plates veg biryani & cucumber raita from Spice Route Restaurant, MG Road before 9 PM',
  },
  {
    id: 'l2',
    title: '25 kg fresh steamed rice and dal',
    donor: 'College Canteen Block C',
    place: 'University Campus Gate 2',
    kg: 25,
    cat: 'cooked',
    categoryLabel: 'Cooked Meals',
    deadline: 18 * 60, // 18:00 (6:00 PM)
    status: 'accepted',
    ngo: 'sewa',
    createdAt: Date.now() - 48 * 60 * 1000,
    rawDraft: '25 kg rice and dal, pickup before 6 PM from Campus Gate 2',
  },
  {
    id: 'l3',
    title: 'Artisan sourdough bread, buns & assorted cakes',
    donor: 'Royal Bakery & Confectionery',
    place: 'Banquet Arcade, Shop 12',
    kg: 12,
    cat: 'bakery',
    categoryLabel: 'Bakery',
    deadline: 22 * 60 + 30, // 22:30 (10:30 PM)
    status: 'collected',
    ngo: 'roti',
    createdAt: Date.now() - 95 * 60 * 1000,
    rawDraft: 'Bread, buns and cake trays 12kg at Royal Bakery till 10:30 pm',
  },
  {
    id: 'l4',
    title: '35 kg seasonal apples & ripe bananas',
    donor: 'Metro Wholesale Mandi',
    place: 'Produce Bay 4, Ring Road',
    kg: 35,
    cat: 'produce',
    categoryLabel: 'Fresh Produce',
    deadline: 20 * 60, // 20:00 (8:00 PM)
    status: 'transit',
    ngo: 'roti',
    code: '849201',
    codeAt: Date.now() - 3 * 60 * 1000, // 3 mins ago
    createdAt: Date.now() - 40 * 60 * 1000,
    rawDraft: '35 kg apples and bananas from Metro Mandi before 8 PM',
  },
];

export const INITIAL_FEED: ActivityFeedItem[] = [
  {
    id: 'f1',
    t: Date.now() - 3 * 60 * 1000,
    text: 'A volunteer started pickup of 35 kg from Metro Wholesale Mandi',
    category: 'pickup',
  },
  {
    id: 'f2',
    t: Date.now() - 15 * 60 * 1000,
    text: 'Spice Route Restaurant listed 40 plates veg biryani & raita',
    category: 'listing',
  },
  {
    id: 'f3',
    t: Date.now() - 32 * 60 * 1000,
    text: 'Sewa Community Kitchen accepted 25 kg from College Canteen Block C',
    category: 'accept',
  },
  {
    id: 'f4',
    t: Date.now() - 55 * 60 * 1000,
    text: 'Royal Bakery handed over 12 kg to Roti Bank Foundation (Verified)',
    category: 'handover',
  },
];
