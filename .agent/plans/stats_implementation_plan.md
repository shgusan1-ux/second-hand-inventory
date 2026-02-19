# Implementation Plan: Detailed Statistics & Naver Sales Sync

## Overview
This plan addresses the user requirement for "more detailed" daily registration stats (averages, last month, this month) and "recent sales" verification. It involves creating dedicated server actions (`stats-actions.ts`) to fetch precise database aggregations and updating the frontend `charts.tsx` to visualize this data. We will also correct the Naver Order fetching logic to ensure recent sales are not missed.

## Phase 1: Robust Database Statistics [Server Actions]
1.  **Enhance `src/lib/stats-actions.ts`**:
    - Add `getDetailedRegistrationStats()` function.
    - Implement the logic for:
        - **Daily Counts (Last 14 Days)**: `GROUP BY date(master_reg_date)`.
        - **This Week Daily Avg**: `COUNT(*) / 7` (where date >= last7days).
        - **Last Week Daily Avg**: `COUNT(*) / 7` (where date >= last14days and date < last7days).
        - **Monthly Daily Avg**: `COUNT(*) / 30` (where date >= last30days).
        - **Last Month Total**: `COUNT(*)` (where month = last_month).
        - **This Month Total**: `COUNT(*)` (where month = this_month).
    - Add `getInventoryFlowStats()` function.
        - **Monthly IN**: `GROUP BY strftime('%Y-%m', master_reg_date)`.
        - **Monthly OUT**: `GROUP BY strftime('%Y-%m', sold_at)` (only counting where `status='판매완료'`).

## Phase 2: Reliable Naver Order Fetching [API Logic]
1.  **Refactor `src/lib/naver/apis/orders.ts`**:
    - The current `getNaverOrders` uses `/last-changed-statuses` which is limited (often 24h).
    - Implement `getNaverOrderList` using `GET /v1/pay-order/seller/product-orders` (Search Endpoint).
        - Parameters: `lastChangedFrom` can be up to 31 days ago (or search by specific dates).
        - This ensures we capture *all* orders in the "Recent 30 Days" window, even if status changed 2 days ago and we missed the poll.
2.  **Update `getOrdersSummary` in `src/lib/naver/apis/stats.ts`**:
    - Use the new reliable search endpoint instead of the polling endpoint.

## Phase 3: Dashboard Integration [Frontend]
1.  **Update `src/components/stats/charts.tsx`**:
    - **Fetch Data**: Call the new server actions (`getDetailedRegistrationStats`, `getInventoryFlowStats`) in `fetchStats` (or a separate fetcher).
    - **Visualize Registration**:
        - Show Detailed Cards: "Today's Reg", "Weekly Avg", "Monthly Avg".
        - Update Bar Chart to use real daily data.
    - **Visualize Inventory Flow**:
        - Update "Monthly Sales" Bar Chart to show IN (Registration) vs OUT (Sales) over the last 6-12 months.
    - **Visualize Sales (Naver)**:
        - Ensure accurate "Recent 30 Days" count is displayed using the fixed API logic.

## Verification
- Verify the DB queries return sensible numbers (e.g. check against simple manual count).
- Verify the Naver API returns orders older than 24 hours.
- Check the frontend charts render correctly with the new data structure.

## Phase 4: Naver Search Ads API Integration [Research]
1.  **Feasibility Check**:
    - Naver Search Ads API is separate from Commerce API.
    - Requires: `API Key`, `Secret Key`, `Customer ID` from Search Ads Center.
    - Endpoint: `https://api.naver.com` (different from `api.commerce.naver.com`).
2.  **Implementation Strategy**:
    - Create `src/lib/naver/search-ads.ts`.
    - Implement `getCampaigns`, `getAdGroups`, `getKeywords` to fetch performance data.
    - Add UI to display "Ad Performance" alongside sales data.
