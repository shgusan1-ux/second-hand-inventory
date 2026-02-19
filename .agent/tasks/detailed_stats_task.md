# Statistical Analysis & Dashboard Improvement Task

## 1. Detailed Registration Statistics (DB-Based)
- [ ] **Enhance `stats-actions.ts`**:
    - Implement `getDetailedRegistrationStats` to calculate:
        - Daily counts for the last 14 days (for trend).
        - "Last Week" Daily Average (Total registrations in last 7 days / 7).
        - "Monthly" Daily Average (Total in last 30 days / 30).
        - "Last Month" Total Count (Previous calendar month).
        - "This Month" Total Count (Current calendar month).

## 2. Accurate Monthly In/Out Flow (DB-Based)
- [ ] **Implement Inventory Flow Stats**:
    - Add `getInventoryFlowStats` to `stats-actions.ts`.
    - **IN (Entrances)**: aggregating `master_reg_date`.
    - **OUT (Sales)**: aggregating `sold_at` (requires ensuring `sold_at` is reliable).
        - *Note*: If `sold_at` is missing for older records, we might need a fallback or just accept it's "from now on".
    - Group by Month (YYYY-MM Format) for the last 12 months.

## 3. Reliable Recent Sales Data (Naver API Fix)
- [ ] **Fix Naver Order Fetching**:
    - The current `getNaverOrders` uses `/last-changed-statuses` which is for sync/polling.
    - Switch to/Add `getNaverOrderList` using `GET /v1/pay-order/seller/product-orders` (or similar search endpoint) to fetch orders over a longer period (e.g., 30 days) reliably.
- [ ] **Update `getOrdersSummary`**:
    - Use the search endpoint to get accurate "Recent 30 Days" sales counts and amounts.

## 4. Dashboard Visualization Update
- [ ] **Update `charts.tsx`**:
    - Replace mock `dailyRegistration` with real data from Step 1.
    - Replace mock `monthlySales` with real In/Out data from Step 2.
    - Add new UI Cards for "Avg Daily Reg", "Last Month Total", etc.
    - Ensure dates are formatted nicely (e.g., "1일", "2일" -> "2/1", "2/2").
