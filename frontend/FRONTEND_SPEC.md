# SurplusLink AI — Frontend Specification & Architectural Audit

**Author:** Principal Frontend Architect & UI/UX Engineer  
**Target Repository:** `https://github.com/Jaskarancode-x/SURPLUS-LINK-AI`  
**Branches Audited:** `main` (Serverpod / Dart backend & protocol), `surplus_link_AIversion2` (Flask AI Extraction Engine)  
**Date:** November 2026

---

## 1. Executive Summary & Core Purpose

SurplusLink AI is a real-time, AI-driven surplus food rescue platform built for **Track 1: Here, Together** (by Berozgar Developer Association). Its mission is to prevent edible food from ending up in landfills by connecting **Donors** (restaurants, cafeterias, event banquet halls, bakeries), **Recipient NGOs** (community kitchens, food banks, shelters), and **Volunteers** (riders, logistics runners) so surplus meals reach people in hours, not landfills.

### Core Value Metric
- $1 \text{ kg surplus food} \approx 2.5 \text{ meals shared} \approx 2.5 \text{ kg } \mathrm{CO}_2 \text{ emissions prevented}$

---

## 2. End-to-End User Flows

```
[Donor Input]  "30 kg rice & dal, pickup before 6 PM from MG Road"
     │
     ▼
[3-Tier AI Extraction Engine] (Gemini 3.1 Flash Lite -> Grok-2 / Groq -> Local Regex/NLP Fallback)
     │
     ▼
[Donor Review & Confirmation] (Flags missing fields: pickup_location, deadline; user verifies & posts)
     │
     ▼
[AI Multi-Criteria Matching Engine] (Scores NGOs based on distance, capacity, deadline ETA, diet category)
     │
     ▼
[NGO Discovery & Acceptance] (NGO reviews matches, ranks, and accepts or passes; broadcasts event)
     │
     ▼
[Volunteer Pickup Queue] (Rider claims pickup; animated transit tracker; generates 6-digit secure code with 15-min TTL)
     │
     ▼
[NGO Handover Desk Verification] (NGO enters 6-digit code; rejects used/expired; verifies chain of custody)
     │
     ▼
[Live Real-Time Impact Dashboard] (Live kg rescued, meals shared, CO2 saved, goal progress ring, timeline chart)
```

---

## 3. Backend API Endpoints & Data Specifications

### A. Python / Flask AI Extraction Backend (`Surplus_link AIversion2`)
*Base URL:* `http://127.0.0.1:5000`

#### 1. Extract Food Listing Details
- **Method & Path:** `POST /api/ai/extract`
- **Request Headers:** `Content-Type: application/json`
- **Request Payload:**
  ```json
  {
    "text": "30 kg rice and dal, pickup before 6 PM from MG Road"
  }
  ```
- **Response Shape (HTTP 200 OK):**
  ```json
  {
    "title": "Rice and dal",
    "category": "Cooked Meals",
    "quantity": 30.0,
    "unit": "kg",
    "deadline": "6 PM",
    "pickup_location": "MG Road",
    "missing_fields": [],
    "provider_used": "gemini",
    "requires_confirmation": true,
    "raw_draft": "30 kg rice and dal, pickup before 6 PM from MG Road",
    "warning": null
  }
  ```
- **Error Response (HTTP 400 Bad Request):**
  ```json
  {
    "error": "Field 'text' must be a non-empty string",
    "raw_draft": "",
    "requires_confirmation": true
  }
  ```

#### 2. Service Health Check
- **Method & Path:** `GET /health`
- **Response Shape (HTTP 200 OK):**
  ```json
  {
    "service": "SurplusLink AI Extraction Engine",
    "status": "healthy"
  }
  ```

#### 3. Service Metadata
- **Method & Path:** `GET /`
- **Response Shape (HTTP 200 OK):**
  ```json
  {
    "service": "SurplusLink AI Extraction Engine",
    "version": "2.0.0",
    "endpoints": {
      "extract": "POST /api/ai/extract",
      "health": "GET /health"
    }
  }
  ```

---

### B. Serverpod / REST Protocol Endpoints (`origin/main`)
*Base URL:* `http://localhost:8080` (or integrated mock gateway)

#### 1. Donation Endpoint (`DonationEndpoint`)
- **`createListing(FoodListing listing, {callerUserId, callerRole})`**
  - **Payload:**
    ```typescript
    interface CreateListingPayload {
      donorUserId: number;
      organisationId?: number;
      title: string;
      rawDescription: string;
      category: 'Cooked Meals' | 'Grains/Staples' | 'Produce' | 'Bakery' | 'Dairy' | 'Other';
      quantity: number;
      unit: string;
      availableUntil: string; // ISO 8601 UTC
      pickupVenue: string;
      latitude?: number;
      longitude?: number;
      handlingNotes?: string;
      missingFieldsFlagged?: string[];
      rescueSessionId?: number;
    }
    ```
  - **Response:** `FoodListing` record with `id`, `status: 'listed' | 'open'`, `createdAt`.
- **`listAvailableListings({category, minQuantity})`**
  - **Returns:** `FoodListing[]` sorted by `availableUntil ASC` (deadline urgency).
- **`updateListing(FoodListing updatedListing, {callerUserId, callerRole})`**
  - **Role Checks:** Only donors can edit contents; NGOs can transition to `accepted`; Volunteers can transition to `pickup_assigned`, `in_transit`, or `collected`.
- **`getListingsByDonor(donorUserId)`**
  - **Returns:** `FoodListing[]` created by that user.

#### 2. Rescue Session Endpoint (`RescueSessionEndpoint`)
- **`createSession({foodListingId, hostDonorId, hostName})`**
  - **Returns:** `RescueSession` with 6-character alphanumeric `joinCode` (e.g., `RESCUE-7QK2` / `7QK29M`), `status: 'active'`.
- **`joinSession({joinCode, userId, userName, role})`**
  - Connects participant (Donor, NGO, or Volunteer) to the live session room.

#### 3. Handover Verification Endpoint (`HandoverVerificationEndpoint`)
- **`verifyCode({code, ngoId, listingId})`**
  - Validates 6-digit one-time code.
  - Rejects if code is expired (>15 min), already consumed, or NGO ID mismatch.
  - Marks listing `collected` / `verified`.

---

## 4. Authentication & Authorization Flow

1. **Role-Based Access Control (RBAC):**
   - Three distinct persona roles:
     - `donor`: Creates listings, triggers AI extraction, confirms listing details, reviews active donations, launches live rescue session.
     - `ngo`: Explores match-ranked offers, reviews distance/capacity/diet suitability, accepts or declines donations, validates 6-digit pickup handover codes.
     - `volunteer`: Views active pickup queue, starts transport, views live transit animation, obtains and reads out 6-digit one-time verification code.
2. **Session Identification:**
   - Client persists current persona role and active user profile in local storage.
   - Join codes enable frictionless ephemeral live sessions across separate physical devices (e.g. volunteer smartphone + NGO reception desktop) without heavy auth friction.

---

## 5. Real-Time Architecture

1. **WebSockets / Serverpod Streams:**
   - Server channels: `global_donations` (all available surplus) and `rescue_session_{id}` (session-specific live updates).
   - Event types: `donationCreated`, `donationAccepted`, `volunteerAssigned`, `pickupStatusChanged`, `handoverVerified`.
2. **Smart Multi-Tab Synchronization:**
   - Local `BroadcastChannel('surpluslink_channel')` and `window.addEventListener('storage')` for immediate cross-tab reactivity with zero-latency synchronization.
3. **Optimistic UI Engine:**
   - Every action (listing post, NGO accept, volunteer pickup start, code verification) updates TanStack Query cache / local state optimistically with rollback safeguards.

---

## 6. Smart Mock Fallback Architecture

To ensure the frontend is **100% testable, interactive, and demo-ready** without running external Python or Serverpod backends:
- `VITE_USE_MOCK_DATA=true` activates an in-browser mock service worker that mimics the exact 3-tier fallback logic, ranking algorithms, 6-digit code generation/expiry, and live data feeds.
- When `VITE_USE_MOCK_DATA=false`, API requests seamlessly route to the backend server via `VITE_API_BASE_URL`.
