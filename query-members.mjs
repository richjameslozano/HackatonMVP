// Quick script to query Members table from Lark Base
const APP_ID = 'cli_a91865699678de19';
const APP_SECRET = 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k';
const BASE_APP_TOKEN = 'PyPSbWKVpakTg5s0uEujZ24fpaf';
const MEMBERS_TABLE = 'tblD7Sv7fRoJUTVu';
const BASE_URL = 'https://open.larksuite.com/open-apis';

async function main() {
  // Step 1: Get tenant token
  const tokenRes = await fetch(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.code !== 0) {
    console.error('Token error:', tokenData);
    process.exit(1);
  }
  const token = tokenData.tenant_access_token;
  console.log('Got token:', token.slice(0, 10) + '...');

  // Step 2: List members
  const url = `${BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${MEMBERS_TABLE}/records/search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  
  if (data.data && data.data.items) {
    console.log(`\nFound ${data.data.items.length} members:\n`);
    for (const item of data.data.items) {
      console.log(JSON.stringify(item, null, 2));
      console.log('---');
    }
  } else {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
