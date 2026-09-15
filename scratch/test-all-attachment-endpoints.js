const fs = require('fs');

async function testBackend() {
  const baseUrl = 'https://zyoris.onrender.com';
  console.log('--- TESTING BACKEND ATTACHMENT ENDPOINTS ---');

  // 1. GET /attachments
  try {
    const res = await fetch(`${baseUrl}/attachments?entityType=PAGE&entityId=test-123`);
    console.log('1. GET /attachments status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('1. GET /attachments error:', e.message);
  }

  // 2. POST /attachments
  try {
    const res = await fetch(`${baseUrl}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUploadId: 'test-upload-id',
        entityType: 'PAGE',
        entityId: 'test-page-id'
      })
    });
    console.log('2. POST /attachments status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('2. POST /attachments error:', e.message);
  }

  // 3. GET /attachments/test-id
  try {
    const res = await fetch(`${baseUrl}/attachments/test-id`);
    console.log('3. GET /attachments/:id status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('3. GET /attachments/:id error:', e.message);
  }

  // 4. PATCH /attachments/test-id
  try {
    const res = await fetch(`${baseUrl}/attachments/test-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { test: true } })
    });
    console.log('4. PATCH /attachments/:id status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('4. PATCH /attachments/:id error:', e.message);
  }

  // 5. DELETE /attachments/test-id
  try {
    const res = await fetch(`${baseUrl}/attachments/test-id`, {
      method: 'DELETE'
    });
    console.log('5. DELETE /attachments/:id status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('5. DELETE /attachments/:id error:', e.message);
  }

  // 6. PATCH /attachments/test-id/archive
  try {
    const res = await fetch(`${baseUrl}/attachments/test-id/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: true })
    });
    console.log('6. PATCH /attachments/:id/archive status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('6. PATCH /attachments/:id/archive error:', e.message);
  }

  // 7. GET /attachments/test-id/download
  try {
    const res = await fetch(`${baseUrl}/attachments/test-id/download`);
    console.log('7. GET /attachments/:id/download status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('7. GET /attachments/:id/download error:', e.message);
  }

  // 8. GET /attachments/test-id/preview
  try {
    const res = await fetch(`${baseUrl}/attachments/test-id/preview`);
    console.log('8. GET /attachments/:id/preview status:', res.status);
    const body = await res.text();
    console.log('   Response:', body.slice(0, 300));
  } catch (e) {
    console.log('8. GET /attachments/:id/preview error:', e.message);
  }
}

testBackend().catch(console.error);
