const XLSX = require('xlsx');

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

try {
  const wb = XLSX.read(Buffer.from(pdfContent), { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  console.log('JSON:', XLSX.utils.sheet_to_json(sheet, { header: 1 }));
} catch (e) {
  console.log('Error:', e.message);
}
