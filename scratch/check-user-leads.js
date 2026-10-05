const axios = require('axios');
const fs = require('fs');

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zyoris.onrender.com';

async function checkUserLeads() {
  try {
    const creds = JSON.parse(fs.readFileSync('/Users/it4/Desktop/zyoris-frontend/scratch/demo-credentials.json', 'utf-8'));
    const token = creds.token;

    console.log('Fetching leads for demo user...');
    const res = await axios.get(`${BASE_URL}/leads/get-leads`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const leads = res.data?.leads || res.data?.data?.leads || res.data || [];
    console.log(`Found ${Array.isArray(leads) ? leads.length : 'unknown'} leads.`);
    
    if (Array.isArray(leads)) {
      console.log('Sample email addresses in DB:');
      leads.slice(0, 10).forEach(l => console.log('-', l.name, ':', l.email));
    }
  } catch (err) {
    console.error('Error fetching leads:', err.response?.data || err.message);
  }
}

checkUserLeads();
