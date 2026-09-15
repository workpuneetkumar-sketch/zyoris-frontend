const fs = require('fs');

async function testWithAuth() {
  const baseUrl = 'https://zyoris.onrender.com';
  console.log('--- TESTING AUTHORIZED ATTACHMENTS API ---');

  // Register temporary test user to obtain valid Bearer JWT token
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test' + Date.now() + '@zyoris.com',
      password: 'Password123!',
      name: 'Test User'
    })
  });
  const regData = await regRes.json();
  const token = regData.token || '';
  console.log('Auth Token obtained:', token ? 'SUCCESS' : 'FAILED');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. GET /attachments
  try {
    const res = await fetch(`${baseUrl}/attachments?entityType=PAGE&entityId=cmu18r2g304vofloops00hnav`, { headers });
    console.log('\n1. GET /attachments status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('1. Error:', e.message);
  }

  // 2. POST /attachments
  let createdAttachmentId = '';
  try {
    const res = await fetch(`${baseUrl}/attachments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileUploadId: 'cmu18r2g304vofloops00hnav',
        entityType: 'PAGE',
        entityId: 'cmu18r2g304vofloops00hnav'
      })
    });
    console.log('\n2. POST /attachments status:', res.status);
    const text = await res.text();
    console.log('   Response:', text);
    try {
      const data = JSON.parse(text);
      createdAttachmentId = data.attachment?.id || data.id || '';
    } catch (e) {}
  } catch (e) {
    console.log('2. Error:', e.message);
  }

  const targetId = createdAttachmentId || 'cmu18r2g304vofloops00hnav';

  // 3. GET /attachments/:id
  try {
    const res = await fetch(`${baseUrl}/attachments/${targetId}`, { headers });
    console.log('\n3. GET /attachments/:id status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('3. Error:', e.message);
  }

  // 4. PATCH /attachments/:id
  try {
    const res = await fetch(`${baseUrl}/attachments/${targetId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ metadata: { test: true } })
    });
    console.log('\n4. PATCH /attachments/:id status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('4. Error:', e.message);
  }

  // 5. PATCH /attachments/:id/archive
  try {
    const res = await fetch(`${baseUrl}/attachments/${targetId}/archive`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isArchived: true })
    });
    console.log('\n5. PATCH /attachments/:id/archive status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('5. Error:', e.message);
  }

  // 6. GET /attachments/:id/download
  try {
    const res = await fetch(`${baseUrl}/attachments/${targetId}/download`, { headers });
    console.log('\n6. GET /attachments/:id/download status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('6. Error:', e.message);
  }

  // 7. GET /attachments/:id/preview
  try {
    const res = await fetch(`${baseUrl}/attachments/${targetId}/preview`, { headers });
    console.log('\n7. GET /attachments/:id/preview status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('7. Error:', e.message);
  }

  // 8. DELETE /attachments/:id
  try {
    const res = await fetch(`${baseUrl}/attachments/${targetId}`, {
      method: 'DELETE',
      headers
    });
    console.log('\n8. DELETE /attachments/:id status:', res.status);
    console.log('   Response:', await res.text());
  } catch (e) {
    console.log('8. Error:', e.message);
  }
}

testWithAuth().catch(console.error);
