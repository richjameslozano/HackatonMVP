/**
 * Bulk Update Script: Populate existing quest records with new assignment columns.
 *
 * This script sets default values for the three new fields on all existing quest records:
 *   - assignment_type: "all"
 *   - assignee_id: "" (empty)
 *   - completion_mode: "multiple"
 *
 * Usage:
 *   node scripts/bulk-update-quests.mjs
 *
 * Prerequisites:
 *   - Node.js 18+ (uses native fetch)
 *   - Lark Base table must already have the new columns added manually
 */

const LARK_CONFIG = {
    appId: 'cli_a91865699678de19',
    appSecret: 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k',
    baseAppToken: 'PyPSbWKVpakTg5s0uEujZ24fpaf',
    baseUrl: 'https://open.larksuite.com/open-apis',
};

const TABLE_ID_QUESTS = 'tblzEYdc7tHCTmNE';

// ─── Get tenant access token ────────────────────────────────────────────────

async function getTenantToken() {
    const res = await fetch(
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

    if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
    const data = await res.json();
    if (data.code !== 0) throw new Error(`Token error: ${data.msg}`);
    return data.tenant_access_token;
}

// ─── List all records from the Quests table ─────────────────────────────────

async function listAllRecords(token) {
    const url = `${LARK_CONFIG.baseUrl}/bitable/v1/apps/${LARK_CONFIG.baseAppToken}/tables/${TABLE_ID_QUESTS}/records/search`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    if (!res.ok) throw new Error(`List records failed: ${res.status}`);
    const data = await res.json();

    if (!data.data?.items) {
        console.log('No records found in Quests table.');
        return [];
    }

    return data.data.items;
}

// ─── Update a single record ─────────────────────────────────────────────────

async function updateRecord(token, recordId, fields) {
    const url = `${LARK_CONFIG.baseUrl}/bitable/v1/apps/${LARK_CONFIG.baseAppToken}/tables/${TABLE_ID_QUESTS}/records/${recordId}`;

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Update failed for ${recordId}: ${res.status} - ${body}`);
    }

    return await res.json();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔑 Fetching tenant access token...');
    const token = await getTenantToken();
    console.log('✅ Token obtained.\n');

    console.log('📋 Fetching all quest records...');
    const records = await listAllRecords(token);
    console.log(`   Found ${records.length} records.\n`);

    if (records.length === 0) {
        console.log('Nothing to update.');
        return;
    }

    const defaultFields = {
        assignment_type: 'all',
        assignee_id: '',
        completion_mode: 'multiple',
    };

    console.log('🔄 Updating records with default values:');
    console.log(`   assignment_type = "all"`);
    console.log(`   assignee_id = "" (empty)`);
    console.log(`   completion_mode = "multiple"\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const record of records) {
        const recordId = record.record_id;
        const fields = record.fields;
        const title = extractText(fields.title);

        // Skip if already has assignment_type set
        const existingAssignmentType = extractText(fields.assignment_type);
        if (existingAssignmentType && existingAssignmentType !== '') {
            console.log(`   ⏭️  Skipping "${title}" (already has assignment_type="${existingAssignmentType}")`);
            skipped++;
            continue;
        }

        try {
            await updateRecord(token, recordId, defaultFields);
            console.log(`   ✅ Updated "${title}"`);
            updated++;
        } catch (err) {
            console.error(`   ❌ Failed "${title}": ${err.message}`);
            failed++;
        }

        // Small delay to avoid rate limiting
        await sleep(100);
    }

    console.log('\n── Summary ──');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed:  ${failed}`);
    console.log(`   Total:   ${records.length}`);
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function extractText(value) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first !== null && 'text' in first) {
            return first.text;
        }
        if (typeof first === 'string') return first;
    }
    return '';
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
    console.error('\n💥 Script failed:', err.message);
    process.exit(1);
});
