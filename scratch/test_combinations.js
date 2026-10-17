async function run() {
  const BACKEND_URL = 'https://zyoris.onrender.com';
  const email = 'comb_' + Date.now() + '@zyoris.test';
  const regRes = await fetch(BACKEND_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Comb User', email, password: 'Password123!', role: 'ADMIN' })
  });
  const regData = await regRes.json();
  const token = regData.token;
  
  const orgRes = await fetch(BACKEND_URL + '/organizations/create-org', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Comb Org', userId: regData.user.id, companyAbout: 'Test', businessType: 'B2B' })
  });
  const orgData = await orgRes.json();
  const validToken = orgData.accessToken;
  const headers = { Authorization: 'Bearer ' + validToken, 'Content-Type': 'application/json' };
  
  const testCases = [
    { desc: 'null name', body: { name: null, visibility: 'PUBLIC' } },
    { desc: 'empty string name', body: { name: '', visibility: 'PUBLIC' } },
    { desc: '1 char name', body: { name: 'a', visibility: 'PUBLIC' } },
    { desc: 'whitespace name', body: { name: '   ', visibility: 'PUBLIC' } },
    { desc: 'special chars name', body: { name: '@@@###$$$', visibility: 'PUBLIC' } },
    { desc: 'null visibility', body: { name: 'test-chan', visibility: null } },
    { desc: 'empty visibility', body: { name: 'test-chan', visibility: '' } },
    { desc: 'missing visibility', body: { name: 'test-chan' } },
    { desc: 'null description', body: { name: 'test-chan', visibility: 'PUBLIC', description: null } },
    { desc: 'long description', body: { name: 'test-chan', visibility: 'PUBLIC', description: 'a'.repeat(5000) } },
    { desc: 'invalid organizationId in body', body: { name: 'test-chan', visibility: 'PUBLIC', organizationId: 'INVALID' } },
    { desc: 'valid organizationId in body', body: { name: 'test-chan', visibility: 'PUBLIC', organizationId: orgData.organization?.id } },
    { desc: 'members array with string', body: { name: 'test-chan', visibility: 'PUBLIC', members: ['usr_123'] } },
    { desc: 'members array with object', body: { name: 'test-chan', visibility: 'PUBLIC', members: [{ userId: 'usr_123' }] } },
    { desc: 'memberIds array', body: { name: 'test-chan', visibility: 'PUBLIC', memberIds: ['usr_123'] } },
    { desc: 'createdById in body', body: { name: 'test-chan', visibility: 'PUBLIC', createdById: 'cmvc-fake' } },
    { desc: 'slug in body', body: { name: 'test-chan', visibility: 'PUBLIC', slug: 'custom-slug' } },
    { desc: 'audience in body', body: { name: 'test-chan', visibility: 'PUBLIC', audience: 'INTERNAL' } },
  ];
  
  for (const tc of testCases) {
    const res = await fetch(BACKEND_URL + '/api/communications/channels', {
      method: 'POST',
      headers,
      body: JSON.stringify(tc.body)
    });
    const status = res.status;
    const body = await res.json().catch(() => null);
    if (status === 500 || JSON.stringify(body).toLowerCase().includes('database error')) {
      console.log('🚨 DATABASE ERROR on:', tc.desc, '=> Status:', status, 'Body:', body);
    } else {
      console.log('tc:', tc.desc, '=>', status, body?.error || body?.name);
    }
  }
}
run().catch(console.error);
