import type { RewardItem, PurchaseRecord, LarkFilter } from '../types';
import { TABLE_IDS } from './config';
import { listRecords, getRecord, createRecord, updateRecord, extractTextValue, extractNumberValue } from './lark-api.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Maps a Lark record to the RewardItem interface. */
function mapRecordToRewardItem(record: { record_id: string; fields: Record<string, unknown> }): RewardItem {
    return {
        itemId: record.record_id,
        title: extractTextValue(record.fields['title']),
        description: extractTextValue(record.fields['description']),
        cost: extractNumberValue(record.fields['cost']),
        imageUrl: extractTextValue(record.fields['image_url']) || null,
        stockQuantity: extractNumberValue(record.fields['stock_quantity']),
        isActive: record.fields['is_active'] !== false,
    };
}

// ─── Balance — stored directly on the Members table ─────────────────────────

/**
 * Gets the member's coin balance directly from the `coins` field on their
 * Members record. This is the single source of truth for balance.
 */
export async function getSpendableBalance(memberId: string): Promise<number> {
    const memberRecord = await getRecord(TABLE_IDS.members, memberId);
    return extractNumberValue(memberRecord.fields['coins']);
}

/**
 * Awards coins to a member by incrementing their `coins` field.
 * Reads current balance, adds the award, and writes back.
 */
export async function awardCoins(memberId: string, amount: number): Promise<number> {
    const memberRecord = await getRecord(TABLE_IDS.members, memberId);
    const currentBalance = extractNumberValue(memberRecord.fields['coins']);
    const newBalance = currentBalance + amount;

    await updateRecord(TABLE_IDS.members, memberId, { coins: newBalance });
    return newBalance;
}

/**
 * Deducts coins from a member by decrementing their `coins` field.
 * Returns the new balance. Throws if insufficient funds.
 */
export async function deductCoins(memberId: string, amount: number): Promise<number> {
    const memberRecord = await getRecord(TABLE_IDS.members, memberId);
    const currentBalance = extractNumberValue(memberRecord.fields['coins']);

    if (currentBalance < amount) {
        throw new Error('Insufficient coins');
    }

    const newBalance = currentBalance - amount;
    await updateRecord(TABLE_IDS.members, memberId, { coins: newBalance });
    return newBalance;
}

// ─── Reward Item CRUD ───────────────────────────────────────────────────────

export async function getActiveRewardItems(): Promise<RewardItem[]> {
    // NOTE: We intentionally do NOT push an `is_active` filter to the backend.
    // Lark stores `is_active` as a boolean checkbox, but the backend's filter
    // matcher compares values as strings, so `is_active is ['true']` never
    // matches a boolean `true` and silently drops every item. Instead we fetch
    // all items and filter on the mapped boolean field client-side.
    const records = await listRecords(TABLE_IDS.rewardItems);
    const items = records
        .map(mapRecordToRewardItem)
        .filter((item) => item.isActive);
    items.sort((a, b) => a.cost - b.cost);
    return items;
}

export async function getAllRewardItems(): Promise<RewardItem[]> {
    const records = await listRecords(TABLE_IDS.rewardItems);
    return records.map(mapRecordToRewardItem);
}

// ─── Purchase History ───────────────────────────────────────────────────────

export async function getPurchaseHistory(memberId: string): Promise<PurchaseRecord[]> {
    const filter: LarkFilter = {
        conjunction: 'and',
        conditions: [
            { field_name: 'member_id', operator: 'is', value: [memberId] },
        ],
    };

    const records = await listRecords(TABLE_IDS.purchases, filter);

    const purchases: PurchaseRecord[] = records.map((record) => ({
        purchaseId: record.record_id,
        memberId: extractTextValue(record.fields['member_id']),
        rewardItemId: extractTextValue(record.fields['reward_item_id']),
        rewardItemTitle: extractTextValue(record.fields['reward_item_title']),
        coinsSpent: extractNumberValue(record.fields['coins_spent']),
        purchasedAt: extractNumberValue(record.fields['purchased_at']),
    }));

    purchases.sort((a, b) => b.purchasedAt - a.purchasedAt);
    return purchases;
}

// ─── Purchase Processing ────────────────────────────────────────────────────

export async function processPurchase(memberId: string, itemId: string): Promise<PurchaseRecord> {
    // 1. Verify balance from member record
    const balance = await getSpendableBalance(memberId);
    const itemRecord = await getRecord(TABLE_IDS.rewardItems, itemId);
    const item = mapRecordToRewardItem(itemRecord);

    if (balance < item.cost) {
        throw new Error('Insufficient coins');
    }

    // 2. Verify stock
    if (item.stockQuantity !== -1 && item.stockQuantity <= 0) {
        throw new Error('Item is no longer available');
    }

    // 3. Deduct coins from member record
    await deductCoins(memberId, item.cost);

    // 4. Create purchase record
    const purchaseFields = {
        member_id: memberId,
        reward_item_id: itemId,
        reward_item_title: item.title,
        coins_spent: item.cost,
        purchased_at: Date.now(),
    };

    const purchaseRecord = await createRecord(TABLE_IDS.purchases, purchaseFields);

    // 5. Decrement stock (skip for unlimited)
    if (item.stockQuantity !== -1) {
        await updateRecord(TABLE_IDS.rewardItems, itemId, {
            stock_quantity: item.stockQuantity - 1,
        });
    }

    // 6. Return mapped purchase record
    return {
        purchaseId: purchaseRecord.record_id,
        memberId,
        rewardItemId: itemId,
        rewardItemTitle: item.title,
        coinsSpent: item.cost,
        purchasedAt: extractNumberValue(purchaseRecord.fields['purchased_at']) || purchaseFields.purchased_at,
    };
}

// ─── Admin Reward Item Management ───────────────────────────────────────────

/** Creates a new reward item in Lark Base. */
export async function createRewardItem(item: Omit<RewardItem, 'itemId'>): Promise<RewardItem> {
    const fields: Record<string, unknown> = {
        title: item.title,
        description: item.description,
        cost: item.cost,
        image_url: item.imageUrl || '',
        stock_quantity: item.stockQuantity,
        is_active: item.isActive,
    };

    const record = await createRecord(TABLE_IDS.rewardItems, fields);
    return mapRecordToRewardItem(record);
}

/** Updates an existing reward item in Lark Base. */
export async function updateRewardItem(
    itemId: string,
    fields: Partial<Omit<RewardItem, 'itemId'>>
): Promise<RewardItem> {
    const larkFields: Record<string, unknown> = {};

    if (fields.title !== undefined) larkFields['title'] = fields.title;
    if (fields.description !== undefined) larkFields['description'] = fields.description;
    if (fields.cost !== undefined) larkFields['cost'] = fields.cost;
    if (fields.imageUrl !== undefined) larkFields['image_url'] = fields.imageUrl || '';
    if (fields.stockQuantity !== undefined) larkFields['stock_quantity'] = fields.stockQuantity;
    if (fields.isActive !== undefined) larkFields['is_active'] = fields.isActive;

    const record = await updateRecord(TABLE_IDS.rewardItems, itemId, larkFields);
    return mapRecordToRewardItem(record);
}

/** Deactivates a reward item (sets is_active = false). */
export async function deactivateRewardItem(itemId: string): Promise<void> {
    await updateRecord(TABLE_IDS.rewardItems, itemId, { is_active: false });
}
