const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zyoris.onrender.com';

async function testCsvImport() {
  try {
    const ts = Date.now();
    const email = `csv_tester_${ts}@zyoris.test`;
    const password = 'Password123!';

    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'CSV Tester',
      email,
      password,
      role: 'ADMIN',
    });
    const initialToken = regRes.data?.token || regRes.data?.data?.token;

    const orgRes = await axios.post(`${BASE_URL}/organizations/create-org`, {
      name: `CSV Test Org ${ts}`,
      userId: regRes.data?.user?.id || regRes.data?.id,
      companyAbout: 'CSV Import Test',
      businessType: 'B2B',
    }, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });

    const token = orgRes.data?.accessToken;

    const csvContent = `name,email,phone,company,industry,jobTitle,city,status,source,estimatedValue,externalId,tags,note
John Doe,john.doe.${ts}@example.com,+15550192,Acme Corp,Software,CTO,Austin,HOT,Website,50000,EXT-101,"enterprise, vip",Q4 Rollout candidate
Jane Smith,jane.smith.${ts}@example.com,+15550193,Globex Corp,Finance,VP,New York,WARM,Referral,75000,EXT-102,"vip",Interested in demo`;

    const form = new FormData();
    form.append('file', Buffer.from(csvContent), {
      filename: 'leads_test.csv',
      contentType: 'text/csv',
    });

    console.log('Posting CSV file to /leads/import...');
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
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await axios.get(`${BASE_URL}/leads/import/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        console.log(`Poll [${i+1}]:`, JSON.stringify(statusRes.data, null, 2));
        const status = statusRes.data?.data?.status || statusRes.data?.status;
        if (status === 'COMPLETED' || status === 'FAILED') {
          break;
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testCsvImport();
