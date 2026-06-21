# Requirements Document

## Introduction

The Coin Spending Store introduces a reward redemption system where members can spend their accumulated coins on rewards. This builds on the existing coin-store-system that handles earning coins through quest completion. A new `/store` page allows members to browse available reward items and make purchases. Admins manage the reward catalog — creating, editing, and removing items with configurable costs and stock levels. Purchase transactions deduct coins from the member's balance and are tracked for history and audit purposes. All data is stored in Lark Base tables, consistent with the existing architecture.

## Glossary

- **Reward_Store**: The page and system responsible for displaying available rewards, processing purchases, and showing purchase history to members.
- **Reward_Item**: A purchasable item in the store catalog, defined by an Admin with a title, description, coin cost, optional image URL, and stock quantity.
- **Store_Service**: The service module responsible for reward item CRUD, purchase processing, balance verification, and purchase history retrieval.
- **Purchase_Record**: A record in Lark Base documenting a completed purchase transaction, including the member, reward item, coin cost at time of purchase, and timestamp.
- **Coin_Balance**: The member's current spendable coin total, calculated as total coins earned minus total coins spent on purchases.
- **Stock_Quantity**: The number of remaining units available for a reward item. A value of -1 indicates unlimited stock.
- **Store_Admin_Panel**: The section within the Admin View where admins create, edit, and manage reward items in the store catalog.

## Requirements

### Requirement 1: Store Page Navigation and Access

**User Story:** As a member, I want to access a store page from the navigation, so that I can browse available rewards to spend my coins on.

#### Acceptance Criteria

1. THE application SHALL include a `/store` route accessible from the navigation sidebar on all protected pages.
2. THE Reward_Store page SHALL be accessible to all authenticated members regardless of role (Agent, Developer, Scrum Master, Admin).
3. WHEN a member navigates to the `/store` route, THE Reward_Store SHALL display the member's current Coin_Balance prominently at the top of the page.
4. THE navigation sidebar SHALL display a store icon and label that links to the `/store` route.
5. WHEN a member navigates to the `/store` route, THE Reward_Store SHALL load and display available reward items within 3 seconds of page load under normal network conditions.

### Requirement 2: Reward Item Display

**User Story:** As a member, I want to see available rewards with their details and costs, so that I can decide what to spend my coins on.

#### Acceptance Criteria

1. THE Reward_Store SHALL display each Reward_Item as a card showing the item title, description (truncated to 150 characters), coin cost, and image (if an image URL is provided).
2. WHEN a Reward_Item has no image URL, THE Reward_Store SHALL display a placeholder icon in place of the image.
3. THE Reward_Store SHALL visually distinguish purchasable items (where the member's Coin_Balance is greater than or equal to the item cost and stock is available) from non-purchasable items.
4. WHEN a Reward_Item has a Stock_Quantity of 0, THE Reward_Store SHALL display the item with an "Out of Stock" indicator and disable the purchase action for that item.
5. THE Reward_Store SHALL display reward items sorted by coin cost in ascending order.
6. WHEN a Reward_Item has a Stock_Quantity of -1 (unlimited), THE Reward_Store SHALL not display a stock count and SHALL always treat the item as in-stock.
7. WHEN a Reward_Item has a positive Stock_Quantity, THE Reward_Store SHALL display the remaining stock count on the item card.

### Requirement 3: Purchase Flow

**User Story:** As a member, I want to purchase a reward item using my coins, so that I can redeem my earned coins for rewards.

#### Acceptance Criteria

1. WHEN a member initiates a purchase, THE Reward_Store SHALL display a confirmation dialog showing the item title, coin cost, and the member's remaining balance after purchase.
2. WHEN a member confirms a purchase, THE Store_Service SHALL verify the member's current Coin_Balance is greater than or equal to the item's coin cost before processing the transaction.
3. IF a member's Coin_Balance is less than the Reward_Item's coin cost at the time of purchase confirmation, THEN THE Store_Service SHALL reject the purchase and THE Reward_Store SHALL display an "Insufficient coins" error message.
4. WHEN a purchase is successful, THE Store_Service SHALL create a Purchase_Record in Lark Base containing the member ID, reward item ID, coin cost at time of purchase, and a timestamp.
5. WHEN a purchase is successful, THE Reward_Store SHALL update the displayed Coin_Balance to reflect the deduction within 2 seconds of confirmation.
6. WHEN a purchase is successful for an item with positive Stock_Quantity, THE Store_Service SHALL decrement the Reward_Item's Stock_Quantity by 1 in Lark Base.
7. IF the Store_Service fails to create the Purchase_Record in Lark Base, THEN THE Store_Service SHALL not decrement stock and SHALL return an error to the caller.
8. IF the Reward_Item's Stock_Quantity reaches 0 between the time the member opened the store and confirmed the purchase, THEN THE Store_Service SHALL reject the purchase and THE Reward_Store SHALL display an "Item is no longer available" error message.

### Requirement 4: Coin Balance Calculation with Spending

**User Story:** As a member, I want my coin balance to reflect both earnings and spending, so that the balance accurately represents my available coins.

#### Acceptance Criteria

1. THE Store_Service SHALL calculate a member's Coin_Balance as the sum of all `coins_awarded` values in Quest_Completions for that member minus the sum of all `coins_spent` values in Purchase_Records for that member.
2. THE Store_Service SHALL return a Coin_Balance with a minimum value of 0, even if calculation errors occur.
3. WHEN a purchase is completed, THE application SHALL refresh the Coin_Balance displayed in both the navigation area and the Reward_Store page within 3 seconds.
4. IF the Store_Service fails to retrieve Purchase_Records for balance calculation, THEN THE Store_Service SHALL retry up to 3 attempts and, if all attempts fail, return the last known balance from the store state.

### Requirement 5: Purchase History

**User Story:** As a member, I want to see my purchase history, so that I can review what I have redeemed.

#### Acceptance Criteria

1. THE Reward_Store SHALL include a "Purchase History" section accessible from the store page.
2. THE Purchase History section SHALL display each Purchase_Record showing the reward item title, coin cost at time of purchase, and purchase date.
3. THE Purchase History section SHALL display records sorted by purchase date in descending order (most recent first).
4. WHEN a member has no Purchase_Records, THE Purchase History section SHALL display an empty-state message indicating no purchases have been made.
5. IF the Store_Service fails to retrieve Purchase_Records for history display, THEN THE Reward_Store SHALL display an error message and provide a retry option.

### Requirement 6: Admin Reward Item Management

**User Story:** As an Admin, I want to create and manage reward items in the store, so that I can control what members can redeem their coins for.

#### Acceptance Criteria

1. THE Store_Admin_Panel SHALL be accessible from the Admin View page as an additional tab or section.
2. THE Store_Admin_Panel SHALL display all existing Reward_Items with their title, coin cost, stock quantity, and active status.
3. WHEN an Admin creates a Reward_Item, THE Store_Admin_Panel SHALL require a title (1–100 characters), coin cost (positive integer between 1 and 100,000), and stock quantity (integer -1 or greater than 0, where -1 means unlimited).
4. WHEN an Admin creates a Reward_Item, THE Store_Admin_Panel SHALL accept an optional description (0–500 characters) and an optional image URL.
5. WHEN an Admin submits a valid Reward_Item creation form, THE Store_Service SHALL create the item record in the Reward_Items table in Lark Base.
6. IF an Admin enters invalid values for any Reward_Item field, THEN THE Store_Admin_Panel SHALL display inline validation errors and prevent submission.
7. THE Store_Admin_Panel SHALL allow an Admin to edit the title, description, coin cost, image URL, and stock quantity of an existing Reward_Item.
8. THE Store_Admin_Panel SHALL allow an Admin to deactivate a Reward_Item, making the item invisible to members on the store page without deleting the record.
9. IF the Lark Base API call fails when creating or updating a Reward_Item, THEN THE Store_Admin_Panel SHALL display an error message and preserve the Admin's entered values in the form.

### Requirement 7: Reward Items Data Model

**User Story:** As a system operator, I want reward store data stored in Lark Base, so that the single-source-of-truth architecture is maintained.

#### Acceptance Criteria

1. THE system SHALL use a `Reward_Items` table in Lark Base with fields: `title` (text), `description` (text), `cost` (number, positive integer), `image_url` (text, optional), `stock_quantity` (number, -1 for unlimited or positive integer), and `is_active` (boolean, default true).
2. THE system SHALL use a `Purchases` table in Lark Base with fields: `member_id` (text), `reward_item_id` (text), `coins_spent` (number, positive integer), `purchased_at` (number, Unix timestamp in milliseconds).
3. THE `config.ts` file SHALL be extended with `TABLE_IDS.rewardItems` and `TABLE_IDS.purchases` entries referencing the new Lark Base tables.
4. THE Store_Service SHALL read Reward_Items filtered by `is_active = true` when displaying the store to members.
5. THE Store_Service SHALL read all Reward_Items regardless of `is_active` status when displaying the Admin panel.

### Requirement 8: Store State Management

**User Story:** As a developer, I want a dedicated Zustand store for the spending store, so that state is managed consistently with the existing architecture.

#### Acceptance Criteria

1. THE system SHALL implement a `useStoreStore` Zustand store (or `useRewardStore`) managing reward items, purchase processing state, and purchase history.
2. THE store SHALL provide actions for: fetching reward items, processing a purchase, fetching purchase history, and refreshing the coin balance after a purchase.
3. WHEN a purchase is processed successfully, THE store SHALL trigger a balance refresh in the existing `useCoinStore` to keep the navigation balance display consistent.
4. THE store SHALL handle loading and error states for each async operation independently.
5. WHEN the Reward_Store page is mounted, THE store SHALL fetch both the reward items list and the member's current Coin_Balance.
