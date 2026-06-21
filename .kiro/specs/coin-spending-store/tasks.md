# Implementation Plan: Coin Spending Store

## Overview

This plan implements a coin spending/reward store where members browse and purchase reward items using accumulated coins, and admins manage the reward catalog. The implementation follows the existing frontend-only architecture with Lark Base as the data layer, Zustand for state management, and React/TypeScript for the UI.

## Tasks

- [ ] 1. Define types, config, and validation utilities
  - [ ] 1.1 Add RewardItem and PurchaseRecord interfaces to types/index.ts
    - Add `RewardItem` interface with fields: `itemId`, `title`, `description`, `cost`, `imageUrl`, `stockQuantity`, `isActive`
    - Add `PurchaseRecord` interface with fields: `purchaseId`, `memberId`, `rewardItemId`, `rewardItemTitle`, `coinsSpent`, `purchasedAt`
    - _Requirements: 7.1, 7.2_

  - [ ] 1.2 Extend TABLE_IDS in config.ts with rewardItems and purchases
    - Add `rewardItems` and `purchases` entries to the `TABLE_IDS` object
    - _Requirements: 7.3_

  - [ ] 1.3 Implement reward item validation functions in utils/validation.ts
    - Add `validateRewardItemTitle(title: string)` — accepts 1–100 non-whitespace-only chars
    - Add `validateRewardItemDescription(description: string)` — accepts 0–500 chars
    - Add `validateRewardItemCost(value: unknown)` — accepts positive integers 1–100,000
    - Add `validateStockQuantity(value: unknown)` — accepts -1 or positive integer > 0
    - Add `validateImageUrl(url: string)` — accepts empty string or valid URL format
    - _Requirements: 6.3, 6.4, 6.6_

  - [ ]* 1.4 Write property test for reward item field validation (Property 7)
    - **Property 7: Reward item field validation**
    - Test title validation with arbitrary strings (0–200 chars), confirm 1–100 non-whitespace accepted
    - Test description validation with arbitrary strings (0–600 chars), confirm 0–500 accepted
    - Test cost validation with integers, floats, NaN; confirm only positive integers 1–100,000 accepted
    - Test stock quantity validation; confirm only -1 and positive integers > 0 accepted
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 1.5 Add description truncation utility in utils/formatting.ts
    - Implement `truncateDescription(text: string, maxLength?: number)` that truncates at 150 chars with ellipsis
    - If length ≤ 150, return unchanged; if > 150, return first 150 chars + "…"
    - _Requirements: 2.1_

  - [ ]* 1.6 Write property test for description truncation (Property 3)
    - **Property 3: Description truncation at 150 characters**
    - Generate arbitrary strings (0–500 chars), verify output ≤ 151 chars, verify strings ≤ 150 returned unchanged, verify longer strings get first 150 chars + "…"
    - **Validates: Requirements 2.1**

  - [ ] 1.7 Add purchasability classification helper in utils/store-helpers.ts
    - Implement `isPurchasable(balance: number, cost: number, stockQuantity: number): boolean`
    - Returns true if `balance >= cost` AND (`stockQuantity === -1` OR `stockQuantity > 0`)
    - _Requirements: 2.3, 2.4, 2.6_

  - [ ]* 1.8 Write property test for purchasability classification (Property 2)
    - **Property 2: Purchasability classification**
    - Generate arbitrary balance (non-negative), cost (1–100,000), stock (-1 or ≥ 0)
    - Verify purchasable iff balance >= cost AND (stock === -1 OR stock > 0)
    - **Validates: Requirements 2.3, 2.4, 2.6, 3.2, 3.3, 3.8**

- [ ] 2. Implement store.service.ts
  - [ ] 2.1 Implement getSpendableBalance function
    - Fetch all `coins_awarded` from Quest_Completions for the member
    - Fetch all `coins_spent` from Purchases for the member
    - Return `Math.max(0, sum(awarded) - sum(spent))`
    - Use `withRetry()` for API calls
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 2.2 Write property test for spendable balance calculation (Property 1)
    - **Property 1: Spendable balance is non-negative difference of earned minus spent**
    - Generate arrays of non-negative awarded values and positive spent values
    - Verify result equals `max(0, sum(awarded) - sum(spent))` and is always ≥ 0
    - **Validates: Requirements 4.1, 4.2**

  - [ ] 2.3 Implement getActiveRewardItems and getAllRewardItems functions
    - `getActiveRewardItems()` — lists items filtered by `is_active = true`, sorted by cost ascending
    - `getAllRewardItems()` — lists all items regardless of active status (for admin)
    - Map Lark record fields to `RewardItem` interface
    - _Requirements: 7.4, 7.5, 2.5_

  - [ ]* 2.4 Write property test for active items filtering (Property 8)
    - **Property 8: Active items filtering excludes inactive items**
    - Generate arrays of RewardItem records with mixed isActive values
    - Verify only active items appear in result and count matches
    - **Validates: Requirements 7.4**

  - [ ]* 2.5 Write property test for items sorted by cost ascending (Property 4)
    - **Property 4: Reward items sorted by cost ascending**
    - Generate arrays of RewardItem objects with varied costs
    - Verify output is in non-decreasing cost order, only active items included
    - **Validates: Requirements 2.5, 7.4**

  - [ ] 2.6 Implement processPurchase function
    - Verify spendable balance >= item cost (reject with "Insufficient coins" if not)
    - Verify stock available (reject with "Item is no longer available" if stock = 0)
    - Create Purchase_Record in Lark Base with member_id, reward_item_id, reward_item_title, coins_spent, purchased_at
    - Decrement stock_quantity by 1 (skip for unlimited stock = -1)
    - If record creation fails, do NOT decrement stock and throw error
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.8_

  - [ ]* 2.7 Write property test for purchase record correctness (Property 5)
    - **Property 5: Purchase record preserves transaction data and decrements stock**
    - Generate valid purchase scenarios (balance >= cost, stock > 0)
    - Verify created record contains exact memberId, rewardItemId, coinsSpent = cost
    - Verify stock decremented by exactly 1 for finite stock items
    - **Validates: Requirements 3.4, 3.6**

  - [ ] 2.8 Implement getPurchaseHistory function
    - Fetch Purchase_Records for a member, sorted by purchased_at descending
    - Map Lark record fields to `PurchaseRecord` interface
    - _Requirements: 5.2, 5.3_

  - [ ]* 2.9 Write property test for purchase history sorted descending (Property 6)
    - **Property 6: Purchase history sorted by date descending**
    - Generate arrays of PurchaseRecord objects with varied timestamps
    - Verify output is in non-increasing purchasedAt order, no additions/removals
    - **Validates: Requirements 5.2, 5.3**

  - [ ] 2.10 Implement createRewardItem, updateRewardItem, deactivateRewardItem functions
    - `createRewardItem(item)` — creates record in Reward_Items table
    - `updateRewardItem(itemId, fields)` — updates specified fields
    - `deactivateRewardItem(itemId)` — sets is_active = false
    - _Requirements: 6.5, 6.7, 6.8_

- [ ] 3. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement reward.store.ts and update coin.store.ts
  - [ ] 4.1 Create useRewardStore Zustand store in src/store/reward.store.ts
    - State: `rewardItems`, `purchaseHistory`, `itemsLoading`, `purchaseLoading`, `historyLoading`, `itemsError`, `purchaseError`, `historyError`, `lastPurchase`
    - Actions: `fetchRewardItems`, `fetchAllRewardItems`, `purchaseItem`, `fetchPurchaseHistory`, `clearPurchaseError`, `clearLastPurchase`
    - `purchaseItem` calls `processPurchase` then triggers `useCoinStore.getState().refreshBalance()`
    - Each action manages independent loading/error states
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 4.2 Update useCoinStore to use getSpendableBalance
    - Modify `fetchBalance` and `refreshBalance` to call `getSpendableBalance` from `store.service.ts` instead of `getCoinBalance` from `coin.service.ts`
    - This makes the navigation balance display spending-aware
    - _Requirements: 4.1, 4.3_

  - [ ]* 4.3 Write unit tests for reward.store.ts
    - Test fetchRewardItems sets items and loading state
    - Test purchaseItem success flow: creates record, refreshes balance, sets lastPurchase
    - Test purchaseItem failure: sets purchaseError, no balance change
    - Test fetchPurchaseHistory success and error states
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 5. Implement store UI components
  - [ ] 5.1 Create RewardItemCard component in src/components/store/RewardItemCard.tsx
    - Display title, truncated description (150 chars), cost, image or placeholder
    - Visual states: purchasable (enabled), insufficient coins (grayed), out of stock (disabled with label)
    - Show stock count for positive stock; hide for unlimited (-1)
    - Click triggers purchase confirmation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [ ] 5.2 Create PurchaseConfirmDialog component in src/components/store/PurchaseConfirmDialog.tsx
    - Show item title, coin cost, current balance, balance after purchase
    - Confirm/Cancel buttons
    - Display error messages on failure (insufficient coins, out of stock)
    - Show loading spinner during purchase processing
    - _Requirements: 3.1, 3.3, 3.5, 3.8_

  - [ ] 5.3 Create PurchaseHistory component in src/components/store/PurchaseHistory.tsx
    - List purchase records: reward item title, coins spent, purchase date
    - Sorted most recent first
    - Empty state message when no purchases
    - Error state with retry button on fetch failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 5.4 Create StorePage in src/pages/StorePage.tsx
    - Route-level page protected by AuthGuard, accessible to all authenticated members
    - Layout: Coin balance header → Reward item grid → Purchase history section
    - Fetch reward items and purchase history on mount
    - Read balance from useCoinStore
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 8.5_

  - [ ]* 5.5 Write unit tests for store UI components
    - Test RewardItemCard renders placeholder when imageUrl is null
    - Test RewardItemCard shows stock count for positive stock, hides for -1
    - Test RewardItemCard shows "Out of Stock" label when stock = 0
    - Test PurchaseConfirmDialog shows correct remaining balance
    - Test PurchaseHistory empty state and error + retry
    - _Requirements: 2.1, 2.2, 2.4, 2.6, 2.7, 3.1, 5.4, 5.5_

- [ ] 6. Implement admin reward management
  - [ ] 6.1 Create RewardItemForm component in src/components/admin/RewardItemForm.tsx
    - Fields: title, description, cost, image URL (optional), stock quantity
    - Inline validation errors using validation utilities from step 1.3
    - Supports create and edit modes
    - Preserves form values on API failure
    - _Requirements: 6.3, 6.4, 6.6, 6.9_

  - [ ] 6.2 Create RewardAdminPanel component in src/components/admin/RewardAdminPanel.tsx
    - Lists all reward items (active + inactive) with title, cost, stock, active status
    - Actions: create new, edit, deactivate
    - Uses RewardItemForm for create/edit
    - Integrated as tab in existing AdminPage
    - _Requirements: 6.1, 6.2, 6.7, 6.8_

  - [ ]* 6.3 Write unit tests for admin components
    - Test RewardAdminPanel lists all items including inactive
    - Test deactivation sets is_active = false
    - Test RewardItemForm validation errors display
    - Test RewardItemForm edit mode pre-populates data
    - Test form preserves values on API error
    - _Requirements: 6.1, 6.2, 6.6, 6.7, 6.8, 6.9_

- [ ] 7. Wire routing and navigation
  - [ ] 7.1 Add /store route to App.tsx within AuthGuard > AppShell
    - Import and add `<Route path="/store" element={<StorePage />} />`
    - Place within existing protected route group
    - _Requirements: 1.1, 1.2_

  - [ ] 7.2 Add store navigation link to sidebar/navigation component
    - Add store icon and label that links to `/store`
    - Visible on all protected pages for all authenticated members
    - _Requirements: 1.4_

  - [ ] 7.3 Add Rewards tab to AdminPage
    - Import RewardAdminPanel and add as tab within AdminPage
    - Protected by existing AdminGuard
    - _Requirements: 6.1_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, consistent with the existing codebase
- All Lark API calls route through `lark-api.service.ts` using `withRetry()` from `auth.service.ts`
- The `useCoinStore` balance is updated to be spending-aware so navigation displays are consistent

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.5", "1.7"] },
    { "id": 2, "tasks": ["1.4", "1.6", "1.8", "2.1", "2.3", "2.8", "2.10"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.5", "2.6", "2.9"] },
    { "id": 4, "tasks": ["2.7", "4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "6.1"] },
    { "id": 7, "tasks": ["5.5", "6.2"] },
    { "id": 8, "tasks": ["6.3", "7.1", "7.2", "7.3"] }
  ]
}
```
