const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zyoris.onrender.com';

async function testPdfImport() {
  try {
    const ts = Date.now();
    const email = `pdf_tester_${ts}@zyoris.test`;
    const password = 'Password123!';

    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'PDF Tester',
      email,
      password,
      role: 'ADMIN',
    });
    const initialToken = regRes.data?.token || regRes.data?.data?.token;

    const orgRes = await axios.post(`${BASE_URL}/organizations/create-org`, {
      name: `PDF Test Org ${ts}`,
      userId: regRes.data?.user?.id || regRes.data?.id,
      companyAbout: 'PDF Import Test',
      businessType: 'B2B',
    }, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });

    const token = orgRes.data?.accessToken;

    // Create a PDF file buffer with text/table content
    const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 12 Tf
50 750 Td (Name,Email,Phone,Company) Tj
0 -20 Td (John Doe,john@example.com,1234567890,Acme Inc) Tj
0 -20 Td (Jane Smith,jane@example.com,0987654321,Globex Corp) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
450
%%EOF`;

    const form = new FormData();
    form.append('file', Buffer.from(pdfContent), {
      filename: 'leads_test.pdf',
      contentType: 'application/pdf',
    });

    console.log('Posting PDF file to /leads/import...');
    const importRes = await axios.post(`${BASE_URL}/leads/import`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
      validateStatus: () => true,
    });

    console.log('Import HTTP status:', importRes.status);
    console.log('Import Response:', importRes.data);

    if (importRes.data?.jobId) {
      const jobId = importRes.data.jobId;
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await axios.get(`${BASE_URL}/leads/import/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('Job status:', JSON.stringify(statusRes.data, null, 2));

      const errRes = await axios.get(`${BASE_URL}/leads/import/${jobId}/errors`, {
        headers: { 'Authorization': `Bearer ${token}` },
        validateStatus: () => true,
      });
      console.log('Job errors status code:', errRes.status);
      console.log('Job errors content:', errRes.data);
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testPdfImport();
