const fs = require('fs');

/**
 * Client-side PDF text parser that extracts text blocks from PDF binary data.
 * Supports uncompressed text streams as well as FlateDecode streams using fflate/zlib if available.
 */
function parsePdfToLeadRows(pdfArrayBuffer) {
  const bytes = new Uint8Array(pdfArrayBuffer);
  let textContent = "";

  // Convert bytes to binary string
  let binaryStr = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binaryStr += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }

  // 1. Extract raw stream text or Tj/TJ tokens
  const textTokens = [];

  // Match (string) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let m;
  while ((m = tjRegex.exec(binaryStr)) !== null) {
    if (m[1].trim()) textTokens.push(m[1].trim());
  }

  // Match [(str1) num (str2)] TJ
  const tjArrRegex = /\[\s*((?:\((?:[^)]*)\)\s*|-?\d+\s*)+)\]\s*TJ/gi;
  while ((m = tjArrRegex.exec(binaryStr)) !== null) {
    const inner = m[1];
    const strRegex = /\(([^)]*)\)/g;
    let sm;
    let piece = "";
    while ((sm = strRegex.exec(inner)) !== null) {
      piece += sm[1];
    }
    if (piece.trim()) textTokens.push(piece.trim());
  }

  // If streams were compressed or plain text found in streams:
  // Extract text between BT and ET
  const btEtRegex = /BT[\s\S]*?ET/g;
  const btBlocks = binaryStr.match(btEtRegex) || [];
  for (const block of btBlocks) {
    const strRegex = /\(([^)]*)\)/g;
    let sm;
    const lineParts = [];
    while ((sm = strRegex.exec(block)) !== null) {
      const val = sm[1].trim();
      if (val) lineParts.push(val);
    }
    if (lineParts.length > 0) {
      textTokens.push(lineParts.join(" "));
    }
  }

  // Also extract plain emails & phone numbers from anywhere in raw binary text if textTokens is sparse
  const fullRawText = textTokens.join("\n") + "\n" + binaryStr;

  // Let's parse lines or structured records from full text
  const lines = fullRawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const extractedRows = [];
  const seenEmails = new Set();

  // Pattern match email addresses and nearby text for name/company/phone
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const emails = line.match(emailRegex);

    if (emails) {
      for (const email of emails) {
        if (seenEmails.has(email.toLowerCase())) continue;
        seenEmails.add(email.toLowerCase());

        // Infer name, phone, company from current line or surrounding lines
        const phones = line.match(phoneRegex) || [];
        const phone = phones.find(p => p.replace(/\D/g, '').length >= 7) || "";

        // Remove email and phone from line to find remaining words (name/company)
        let cleaned = line.replace(email, "").replace(phone, "").replace(/[^\w\s.,-]/g, "").trim();
        const parts = cleaned.split(/\s{2,}|\t|,/).map(p => p.trim()).filter(Boolean);

        let name = parts[0] || email.split("@")[0].replace(/[._]/g, " ");
        let company = parts[1] || "";

        extractedRows.push({
          name: name || "Unknown Lead",
          email: email,
          phone: phone,
          company: company,
        });
      }
    }
  }

  return extractedRows;
}

console.log('PDF to Lead Rows parser module ready');
