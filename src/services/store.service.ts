import type { RewardItem, PurchaseRecord, LarkFilter } from '../types';
import { TABLE_IDS } from './config';
import { listRecords, getRecord, createRecord, updateRecord, extractTextValue, extractNumberValue } from './lark-api.service';
import { withRetry } from './auth.service';

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

// ─── Balance Calculation ────────────────────────────────────────────────────

export async function getSpendableBalance(memberId: string): Promise<number> {
    const filter: LarkFilter = {
        conjunction: 'and',
        conditions: [
            { field_name: 'member_id', operator: 'is', value: [memberId] },
        ],
    };

    const [completionRecords, purchaseRecords] = await Promise.all([
        withRetry(() => listRecords(TABLE_IDS.questCompletions, filter)),
        withRetry(() => listRecords(TABLE_IDS.purchases, filter)),
    ]);

    const totalAwarded = completionRecords.reduce(
        (sum, r) => sum + extractNumberValue(r.fields['coins_awarded']),
        0
    );

    const totalSpent = purchaseRecords.reduce(
        (sum, r) => sum + extractNumberValue(r.fields['coins_spent']),
        0
    );

    return Math.max(0, totalAwarded - totalSpent);
}

// ─── Reward Item CRUD ───────────────────────────────────────────────────────

export async function getActiveRewardItems(): Promise<RewardItem[]> {
    const filter: LarkFilter = {
        conjunction: 'and',
        conditions: [
            { field_name: 'is_active', operator: 'is', value: ['true'] },
        ],
    };

    const records = await listRecords(TABLE_IDS.rewardItems, filter);
    const items = records.map(mapRecordToRewardItem);
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
    // 1. Verify balance
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

    // 3. Create purchase record (if this fails, no stock decrement)
    const purchaseFields = {
        member_id: memberId,
        reward_item_id: itemId,
        reward_item_title: item.title,
        coins_spent: item.cost,
        purchased_at: Date.now(),
    };

    const purchaseRecord = await createRecord(TABLE_IDS.purchases, purchaseFields);

    // 4. Decrement stock (skip for unlimited)
    if (item.stockQuantity !== -1) {
        await updateRecord(TABLE_IDS.rewardItems, itemId, {
            stock_quantity: item.stockQuantity - 1,
        });
    }

    // 5. Return mapped purchase record
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
