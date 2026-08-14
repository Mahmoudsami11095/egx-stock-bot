# 🔧 Refresh & Sync Performance Optimizations

**Date:** 2026-08-14  
**Summary:** Fixes for slow refresh times and intermittent sync failures in the EGX Stock Bot web system.

---

## Problem Analysis

The refresh/sync flow was taking **2–9 minutes** and failing when:

1. **`src/services/dataFetcher.ts` (Azure VM path)**
   - Called `loadEarningsOverrides()` **inside the per-stock loop** (108+ synchronous file I/O reads per refresh)
   - Made **sequential `await` calls** to Google News RSS + Gemini AI for **every stock** (108+ × 1–5s each)

2. **`api/stocks.js` (Vercel fallback path)**
   - Made **sequential RSS scraping calls** for up to 350 stocks
   - Had **no timeout** on the TradingView scan — could hang indefinitely
   - Azure VM proxy timeout was only **3.5s**, causing premature fallback to the slower Vercel path

3. **`api/gold.js`**
   - Had **no caching** — every refresh triggered multiple external API calls (TradingView + Yahoo + exchange rates)

4. **Frontend (`stock-api.service.ts`)**
   - Triggered a full backend re-fetch on every page load/navigation with **no cooldown**

5. **`signalDetector.ts`**
   - `logSignalHistory()` did **synchronous file I/O** per stock, blocking the event loop

6. **`egxLiveScraperService.ts`**
   - Polled TradingView every **4 seconds**, competing with the API and cron scheduler for rate limits

---

## Changes Made

### 1. `src/services/dataFetcher.ts`
- ✅ **Moved `loadEarningsOverrides()` outside the loop** — called once per batch instead of per stock
- ✅ **Parallelized fundamentals fetching** using new `mapWithConcurrency()` helper (max 8 concurrent calls)
- ✅ **Added AI extraction circuit breaker** — after 3 consecutive failures, skips Gemini/News fetching for 5 minutes
- ✅ **Two-pass processing**: first parse all TradingView rows (no awaits), then fetch fundamentals in parallel

### 2. `api/stocks.js`
- ✅ **Parallelized RSS earnings scraping** using `mapWithConcurrency()` (max 10 concurrent calls)
- ✅ **Added 10-second hard timeout** to `fetchTradingViewScan()` with timer cleanup on success/error
- ✅ **Increased Azure VM proxy timeout** from 3.5s to **8s**

### 3. `api/gold.js`
- ✅ **Added 30-second in-memory cache** (`GOLD_CACHE_TTL_MS = 30000`) — serves cached data within TTL to reduce redundant external API calls

### 4. `frontend/src/app/core/services/stock-api.service.ts`
- ✅ **Added 30-second refresh cooldown** (`REFRESH_COOLDOWN_MS = 30000`) — skips redundant refreshes on rapid page navigation
- ✅ `updateOverrides()` now bypasses cooldown via `force` parameter

### 5. `src/services/signalDetector.ts`
- ✅ **Made `logSignalHistory()` non-blocking** using `setImmediate()` to defer synchronous file I/O out of the hot path

### 6. `src/services/egxLiveScraperService.ts`
- ✅ **Increased polling interval from 4s to 10s** — reduces TradingView rate-limiting pressure

### 7. `src/index.ts`
- ✅ Fixed pre-existing TypeScript error: removed invalid 3rd argument to `getBatchQuoteAndIndicators()`

---

## Expected Impact

| Area | Before | After |
|------|--------|-------|
| Azure VM refresh (cold cache) | 2–9 minutes | ~30–60 seconds |
| Vercel fallback refresh | Up to 8.75 min | ~30 seconds |
| Gold API call | 2–5 seconds every call | ~0ms within 30s cache |
| Frontend navigation | Full re-fetch every page | 30s cooldown between refreshes |
| TradingView polling | Every 4s | Every 10s |
| Signal history writes | Synchronous (blocking) | Deferred via `setImmediate` |

---

## Files Changed

| File | Type |
|------|------|
| `src/services/dataFetcher.ts` | Performance fix |
| `api/stocks.js` | Performance fix |
| `api/gold.js` | Performance fix |
| `frontend/src/app/core/services/stock-api.service.ts` | Performance fix |
| `src/services/signalDetector.ts` | Performance fix |
| `src/services/egxLiveScraperService.ts` | Performance fix |
| `src/index.ts` | TypeScript fix |