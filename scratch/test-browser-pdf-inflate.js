const fs = require('fs');
const zlib = require('zlib');

function testPdfDecompression(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const bufferString = pdfBuffer.toString('binary');
  
  let decompressedText = '';

  // Match stream ... endstream blocks in PDF
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let count = 0;
  while ((match = streamRegex.exec(bufferString)) !== null) {
    count++;
    const rawStream = match[1];
    const dictStart = Math.max(0, match.index - 350);
    const dictSnippet = bufferString.substring(dictStart, match.index);
    
    if (dictSnippet.includes('/FlateDecode') || dictSnippet.includes('/Fl')) {
      try {
        const streamBytes = pdfBuffer.subarray(match.index + match[0].indexOf(rawStream), match.index + match[0].indexOf(rawStream) + rawStream.length);
        const decompressed = zlib.inflateSync(streamBytes);
        decompressedText += '\n' + decompressed.toString('utf-8');
      } catch (e) {
        // Retry with raw inflate or skip header if zlib header varies
        try {
          const streamBytes = pdfBuffer.subarray(match.index + match[0].indexOf(rawStream), match.index + match[0].indexOf(rawStream) + rawStream.length);
          const decompressed = zlib.inflateRawSync(streamBytes.subarray(2));
          decompressedText += '\n' + decompressed.toString('utf-8');
        } catch (err2) {
          // ignore
        }
      }
    }
  }

  console.log(`Processed ${count} streams.`);

  const fullText = decompressedText + '\n' + bufferString;

  // Match emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set((fullText.match(emailRegex) || []).map(e => e.toLowerCase()))];

  console.log(`Found ${emails.length} unique emails after FlateDecode inflate:`, emails);
}

testPdfDecompression('/Users/it4/Downloads/data1.pdf');
