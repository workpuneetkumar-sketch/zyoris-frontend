const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zyoris.onrender.com';

/**
 * Robust Client-Side PDF Lead Extractor
 * Extracts text streams (including compressed streams using zlib) and table layout from PDF files.
 */
function extractLeadsFromPdfBuffer(pdfBuffer) {
  const zlib = require('zlib');
  const bufferString = pdfBuffer.toString('binary');
  
  let decompressedText = '';

  // 1. Find all stream ... endstream blocks in PDF
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(bufferString)) !== null) {
    const rawStream = match[1];
    // Check preceding dictionary for /Filter /FlateDecode
    const dictStart = Math.max(0, match.index - 300);
    const dictSnippet = bufferString.substring(dictStart, match.index);
    
    if (dictSnippet.includes('/FlateDecode') || dictSnippet.includes('/Fl')) {
      try {
        const streamBytes = pdfBuffer.subarray(match.index + match[0].indexOf(rawStream), match.index + match[0].indexOf(rawStream) + rawStream.length);
        const decompressed = zlib.inflateSync(streamBytes);
        decompressedText += '\n' + decompressed.toString('utf-8');
      } catch (e) {
        // Fallback to uncompressed string
        decompressedText += '\n' + rawStream;
      }
    } else {
      decompressedText += '\n' + rawStream;
    }
  }

  const fullText = decompressedText + '\n' + bufferString;

  // 2. Extract Tj / TJ string literal tokens
  const textTokens = [];
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let tm;
  while ((tm = tjRegex.exec(fullText)) !== null) {
    if (tm[1].trim()) textTokens.push(tm[1].trim());
  }

  const tjArrRegex = /\[\s*((?:\((?:[^)]*)\)\s*|-?\d+\s*)+)\]\s*TJ/gi;
  while ((tm = tjArrRegex.exec(fullText)) !== null) {
    const inner = tm[1];
    const strRegex = /\(([^)]*)\)/g;
    let sm;
    let piece = "";
    while ((sm = strRegex.exec(inner)) !== null) {
      piece += sm[1];
    }
    if (piece.trim()) textTokens.push(piece.trim());
  }

  // 3. Extract all email addresses and parse surrounding fields
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;

  const allText = textTokens.length > 0 ? textTokens.join("\n") : fullText;
  const lines = allText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const leads = [];
  const seenEmails = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const emails = line.match(emailRegex);
    if (!emails) continue;

    for (const email of emails) {
      if (seenEmails.has(email.toLowerCase())) continue;
      seenEmails.add(email.toLowerCase());

      // Look at current line + adjacent 2 lines for phone, name, company
      const windowText = [lines[i-1] || '', line, lines[i+1] || ''].join(' ');
      const phones = windowText.match(phoneRegex) || [];
      const phone = phones.find(p => p.replace(/\D/g, '').length >= 7) || '';

      // Clean line text to find company and name
      let cleanLine = line.replace(email, '').replace(phone, '').replace(/[^\w\s.,-]/g, ' ').trim();
      const parts = cleanLine.split(/\s{2,}|\t|,/).map(p => p.trim()).filter(Boolean);

      let name = parts[0] || email.split('@')[0].replace(/[._]/g, ' ');
      let company = parts[1] || '';

      // Capitalize name
      name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      leads.push({
        name,
        email,
        phone,
        company,
      });
    }
  }

  return leads;
}

function convertLeadsToCsv(leads) {
  const headers = ['name', 'email', 'phone', 'company'];
  const rows = leads.map(l => [
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.company || '').replace(/"/g, '""')}"`
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

async function testFullPdfFlow() {
  try {
    const ts = Date.now();
    console.log('1. Registering & creating org...');
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'PDF Flow Tester',
      email: `pdf_flow_${ts}@zyoris.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    const initialToken = regRes.data?.token || regRes.data?.data?.token;

    const orgRes = await axios.post(`${BASE_URL}/organizations/create-org`, {
      name: `PDF Flow Org ${ts}`,
      userId: regRes.data?.user?.id || regRes.data?.id,
      companyAbout: 'PDF Flow Test',
      businessType: 'B2B',
    }, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });
    const token = orgRes.data?.accessToken;

    // Create a PDF buffer with sample lead text
    const sampleLeadsText = `
    HCL Technologies Noida A-10/11, Sector 3 -2520946 investors.hcl.${ts}@hcl.com
    Samsung India Electronics Noida Sector 81 1800-40-7267864 support.samsung.${ts}@samsung.com
    Paytm Communications Noida B-121 -4770799 care.paytm.${ts}@paytm.com
    `;

    // Simple uncompressed stream PDF
    const pdfBuffer = Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length ${sampleLeadsText.length + 100} >> stream
BT
/F1 12 Tf
50 750 Td (${sampleLeadsText.replace(/\n/g, ') Tj 0 -15 Td (')}) Tj
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
%%EOF`);

    console.log('2. Parsing PDF client-side...');
    const leads = extractLeadsFromPdfBuffer(pdfBuffer);
    console.log(`Extracted ${leads.length} leads from PDF:`, leads);

    if (leads.length === 0) {
      console.error('No leads extracted!');
      return;
    }

    const csvData = convertLeadsToCsv(leads);
    console.log('Converted CSV Data:\n', csvData);

    const form = new FormData();
    form.append('file', Buffer.from(csvData), {
      filename: `leads_extracted_from_pdf_${ts}.csv`,
      contentType: 'text/csv',
    });

    console.log('3. Uploading converted CSV to /leads/import...');
    const importRes = await axios.post(`${BASE_URL}/leads/import`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Import HTTP Response:', importRes.data);
    const jobId = importRes.data.jobId;

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await axios.get(`${BASE_URL}/leads/import/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log(`Poll [${i+1}]:`, statusRes.data?.data || statusRes.data);
      const st = statusRes.data?.data?.status || statusRes.data?.status;
      if (st === 'COMPLETED' || st === 'FAILED') break;
    }

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testFullPdfFlow();
