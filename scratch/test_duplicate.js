async function test() {
  const BACKEND_URL = 'https://zyoris.onrender.com';
  const email = 'diag3_' + Date.now() + '@zyoris.test';
  const password = 'Password123!';
  
  const regRes = await fetch(BACKEND_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Diag3 User', email, password, role: 'ADMIN' })
  });
  const regData = await regRes.json();
  const userId = regData.user.id;
  const regToken = regData.token;
  
  const orgRes = await fetch(BACKEND_URL + '/organizations/create-org', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + regToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Diag Org 3', userId, companyAbout: 'Test', businessType: 'B2B' })
  });
  const orgData = await orgRes.json();
  const token = orgData.accessToken;
  
  console.log('1. First channel creation: name=general');
  const ch1 = await fetch(BACKEND_URL + '/api/communications/channels', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'general', visibility: 'PUBLIC' })
  });
  console.log('Ch1 status:', ch1.status);
  
  console.log('2. Second channel creation with SAME NAME: name=general');
  const ch2 = await fetch(BACKEND_URL + '/api/communications/channels', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'general', visibility: 'PUBLIC' })
  });
  console.log('Ch2 status:', ch2.status);
  console.log('Ch2 body:', await ch2.json());
}
test().catch(console.error);
