/**
 * Script: check-completions.mjs
 * 
 * Double-checks that every quest_id in the Quest_Completions table
 * still exists in the Quests table. Reports orphans and duplicates.
 * 
 * Usage: node scripts/check-completions.mjs
 */

const APP_ID = 'cli_a91865699678de19';
const APP_SECRET = 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k';
const BASE_APP_TOKEN = 'PyPSbWKVpakTg5s0uEujZ24fpaf';
const BASE_URL = 'https://open.larksuite.com/open-apis';

const TABLE_IDS = {
    members: 'tblD7Sv7fRoJUTVu',
    quests: 'tblzEYdc7tHCTmNE',
    questCompletions: 'tblC8k1INWUFfXYm',
    badges: 'tblOGjFWhsYaRNwu',
    badgeEarned: 'tblnVFbK2EzKTsV6',
};

// ─── Helper: Get tenant token ───────────────────────────────────────────────

async function getTenantToken() {
    const res = await fetch(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const data = await res.json();
    if (data.code !== 0) throw new Error(`Token error: ${data.msg}`);
    return data.tenant_access_token;
}

// ─── Helper: Fetch all records from a table ─────────────────────────────────

async function fetchAllRecords(token, tableId) {
    const url = `${BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${tableId}/records/search`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });
    const data = await res.json();
    return data.data?.items ?? [];
}

// ─── Helper: Extract text value from Lark field ─────────────────────────────

function extractText(value) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first !== null && 'text' in first) return first.text;
        if (typeof first === 'string') return first;
    }
    return '';
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔍 Fetching tenant token...');
    const token = await getTenantToken();

    console.log('📋 Fetching Quest_Completions...');
    const completions = await fetchAllRecords(token, TABLE_IDS.questCompletions);
    console.log(`   Found ${completions.length} completion records\n`);

    console.log('📋 Fetching Quests...');
    const quests = await fetchAllRecords(token, TABLE_IDS.quests);
    console.log(`   Found ${quests.length} quest records\n`);

    // Build quest lookup map
    const questMap = new Map();
    for (const q of quests) {
        questMap.set(q.record_id, {
            id: q.record_id,
            title: extractText(q.fields.title),
            status: extractText(q.fields.status) || 'unknown',
            target_role: extractText(q.fields.target_role) || 'unknown',
        });
    }

    // Analyze completions
    const completionsByMember = {};
    const orphanedCompletions = [];
    const duplicateCompletions = [];
    const seenCombos = new Set();

    for (const c of completions) {
        const memberId = extractText(c.fields.member_id);
        const questId = extractText(c.fields.quest_id);
        const completedAt = c.fields.completed_at;
        const recordId = c.record_id;

        // Track per member
        if (!completionsByMember[memberId]) completionsByMember[memberId] = [];
        completionsByMember[memberId].push({ recordId, questId, completedAt });

        // Check if quest exists
        if (!questMap.has(questId)) {
            orphanedCompletions.push({ recordId, memberId, questId, completedAt });
        }

        // Check for duplicates (same member + same quest)
        const combo = `${memberId}::${questId}`;
        if (seenCombos.has(combo)) {
            duplicateCompletions.push({ recordId, memberId, questId, completedAt });
        }
        seenCombos.add(combo);
    }

    // ─── Report ─────────────────────────────────────────────────────────────

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 COMPLETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    for (const [memberId, comps] of Object.entries(completionsByMember)) {
        console.log(`👤 Member: ${memberId}`);
        console.log(`   Completions: ${comps.length}`);
        console.log(`   Unique quests: ${new Set(comps.map(c => c.questId)).size}`);
        for (const comp of comps) {
            const quest = questMap.get(comp.questId);
            const status = quest ? `[${quest.status}] "${quest.title}"` : '❌ QUEST NOT FOUND';
            console.log(`     - ${comp.questId} → ${status}`);
        }
        console.log();
    }

    if (orphanedCompletions.length > 0) {
        console.log('⚠️  ORPHANED COMPLETIONS (quest no longer exists):');
        for (const o of orphanedCompletions) {
            console.log(`   Record ${o.recordId}: member=${o.memberId}, quest=${o.questId}`);
        }
        console.log();
    } else {
        console.log('✅ No orphaned completions found.\n');
    }

    if (duplicateCompletions.length > 0) {
        console.log('⚠️  DUPLICATE COMPLETIONS (same member+quest):');
        for (const d of duplicateCompletions) {
            console.log(`   Record ${d.recordId}: member=${d.memberId}, quest=${d.questId}`);
        }
        console.log();
    } else {
        console.log('✅ No duplicate completions found.\n');
    }

    // Badge check
    console.log('═══════════════════════════════════════════════════════');
    console.log('🏆 BADGE CHECK');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 Fetching Badges...');
    const badges = await fetchAllRecords(token, TABLE_IDS.badges);
    console.log(`   Found ${badges.length} badge definitions\n`);

    for (const b of badges) {
        const name = extractText(b.fields.name);
        const role = extractText(b.fields.target_role);
        const required = b.fields.required_completions;
        console.log(`   🎖️  "${name}" (${role}) — requires ${required} completions`);
    }

    console.log('\n📋 Fetching Badge_Earned...');
    const earned = await fetchAllRecords(token, TABLE_IDS.badgeEarned);
    console.log(`   Found ${earned.length} earned badge records\n`);

    for (const e of earned) {
        console.log(`   ✅ Record ${e.record_id}`);
        console.log(`      All fields: ${JSON.stringify(e.fields, null, 2)}`);
    }

    // Also dump one quest completion to compare field names
    if (completions.length > 0) {
        console.log('\n📋 Quest_Completion sample fields:');
        console.log(JSON.stringify(completions[0].fields, null, 2));
    }

    // List Badge_Earned table fields
    console.log('\n📋 Fetching Badge_Earned table field definitions...');
    const fieldsRes = await fetch(
        `${BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${TABLE_IDS.badgeEarned}/fields`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const fieldsData = await fieldsRes.json();
    if (fieldsData.data?.items) {
        console.log('   Badge_Earned table columns:');
        for (const f of fieldsData.data.items) {
            console.log(`     - "${f.field_name}" (type: ${f.type})`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Done.');
}

main().catch(console.error);
