/**
 * Smoke test: verifies Lark API connection works.
 * Run with: npx tsx scripts/smoke-test.ts
 *
 * Before running, make sure:
 * 1. src/services/config.ts has your real credentials
 * 2. TABLE_IDS has at least one real table ID from your Lark Base
 */

import { LARK_CONFIG, TABLE_IDS } from '../src/services/config';

async function main() {
    console.log('🔑 Fetching tenant_access_token...');

    const tokenRes = await fetch(
        `${LARK_CONFIG.baseUrl}/auth/v3/tenant_access_token/internal`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: LARK_CONFIG.appId,
                app_secret: LARK_CONFIG.appSecret,
            }),
        }
    );

    const tokenData = await tokenRes.json() as {
        code: number;
        msg: string;
        tenant_access_token: string;
        expire: number;
    };

    if (tokenData.code !== 0) {
        console.error('❌ Token fetch failed:', tokenData.msg);
        process.exit(1);
    }

    console.log('✅ Token obtained! Expires in', tokenData.expire, 'seconds');
    const token = tokenData.tenant_access_token;

    // Try listing records from the members table
    const tableId = TABLE_IDS.members;
    console.log(`\n📋 Listing records from table: ${tableId}...`);

    const listRes = await fetch(
        `${LARK_CONFIG.baseUrl}/bitable/v1/apps/${LARK_CONFIG.baseAppToken}/tables/${tableId}/records/search`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        }
    );

    const listData = await listRes.json() as {
        code: number;
        msg: string;
        data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> };
    };

    if (listData.code !== 0) {
        console.error('❌ List records failed:', listData.code, listData.msg);
        console.log('\n💡 Make sure TABLE_IDS.members in config.ts is a real table ID from your Lark Base.');
        console.log('   You can find table IDs in the Lark Base URL: .../base/{baseAppToken}?table={TABLE_ID}');
        process.exit(1);
    }

    const items = listData.data?.items ?? [];
    console.log(`✅ Found ${items.length} record(s)\n`);

    if (items.length === 0) {
        console.log('(Table is empty — add some data to Lark Base to see records here)');
    } else {
        items.forEach((item, i) => {
            console.log(`--- Record ${i + 1} (ID: ${item.record_id}) ---`);
            console.log(JSON.stringify(item.fields, null, 2));
            console.log('');
        });
    }

    console.log('🎉 Smoke test passed! Lark API connection is working.');
}

main().catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
