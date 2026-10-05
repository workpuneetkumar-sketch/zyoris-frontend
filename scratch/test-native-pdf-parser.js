const fs = require('fs');

async function decompressFlate(bytes) {
  try {
    const rawBytes = bytes.subarray(2);
    const ds = new DecompressStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(rawBytes);
    writer.close();
    const response = new Response(ds.readable);
    const buf = await response.arrayBuffer();
    return new TextDecoder("utf-8").decode(buf);
  } catch (e) {
    try {
      const ds = new DecompressStream("deflate");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const response = new Response(ds.readable);
      const buf = await response.arrayBuffer();
      return new TextDecoder("utf-8").decode(buf);
    } catch (err2) {
      return new TextDecoder("latin1").decode(bytes);
    }
  }
}

async function parseRealPdf(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const bufferString = pdfBuffer.toString('binary');
  
  let extractedText = '';

  // 1. Scan stream ... endstream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let count = 0;
  while ((match = streamRegex.exec(bufferString)) !== null) {
    count++;
    const rawStream = match[1];
    const dictStart = Math.max(0, match.index - 350);
    const dictSnippet = bufferString.substring(dictStart, match.index);
    const streamBytes = pdfBuffer.subarray(match.index + match[0].indexOf(rawStream), match.index + match[0].indexOf(rawStream) + rawStream.length);

    if (dictSnippet.includes('/FlateDecode') || dictSnippet.includes('/Fl')) {
      const text = await decompressFlate(streamBytes);
      extractedText += '\n' + text;
    } else {
      extractedText += '\n' + rawStream;
    }
  }

  const fullContent = extractedText + '\n' + bufferString;

  // Extract Tj / TJ string literal tokens
  const textTokens = [];
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let tm;
  while ((tm = tjRegex.exec(fullContent)) !== null) {
    if (tm[1].trim()) textTokens.push(tm[1].trim());
  }

  const tjArrRegex = /\[\s*((?:\((?:[^)]*)\)\s*|-?\d+\s*)+)\]\s*TJ/gi;
  while ((tm = tjArrRegex.exec(fullContent)) !== null) {
    const inner = tm[1];
    const strRegex = /\(([^)]*)\)/g;
    let sm;
    let piece = "";
    while ((sm = strRegex.exec(inner)) !== null) {
      piece += sm[1];
    }
    if (piece.trim()) textTokens.push(piece.trim());
  }

  // Extract BT...ET text blocks
  const btEtRegex = /BT[\s\S]*?ET/g;
  const btBlocks = fullContent.match(btEtRegex) || [];
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

  const allLines = (textTokens.length > 0 ? textTokens.join("\n") : fullContent)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  console.log(`Extracted ${allLines.length} lines from real PDF stream parser.`);
  
  // Extract emails, phones, names, companies
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;

  const rows = [];
  const seenEmails = new Set();

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const emails = line.match(emailRegex);
    if (!emails) continue;

    for (const email of emails) {
      const lower = email.toLowerCase();
      if (seenEmails.has(lower)) continue;
      seenEmails.add(lower);

      const windowText = [allLines[i-1] || '', line, allLines[i+1] || ''].join(' ');
      const phones = windowText.match(phoneRegex) || [];
      const phone = phones.find(p => p.replace(/\D/g, '').length >= 7) || '';

      let cleanLine = line.replace(email, '').replace(phone, '').replace(/[^\w\s.,-]/g, ' ').trim();
      const parts = cleanLine.split(/\s{2,}|\t|,/).map(p => p.trim()).filter(Boolean);

      let name = parts[0] || email.split('@')[0].replace(/[._]/g, ' ');
      let company = parts[1] || '';
      name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      rows.push({ name, email, phone, company });
    }
  }

  console.log(`Parsed ${rows.length} lead rows from PDF:`, rows.slice(0, 5));
}

parseRealPdf('/Users/it4/Downloads/data1.pdf');
