const fs = require('fs');

function inspectPdf(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log('File size:', pdfBuffer.length, 'bytes');
  
  const zlib = require('zlib');
  const bufferString = pdfBuffer.toString('binary');
  
  let decompressedText = '';
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(bufferString)) !== null) {
    const rawStream = match[1];
    const dictStart = Math.max(0, match.index - 300);
    const dictSnippet = bufferString.substring(dictStart, match.index);
    
    if (dictSnippet.includes('/FlateDecode') || dictSnippet.includes('/Fl')) {
      try {
        const streamBytes = pdfBuffer.subarray(match.index + match[0].indexOf(rawStream), match.index + match[0].indexOf(rawStream) + rawStream.length);
        const decompressed = zlib.inflateSync(streamBytes);
        decompressedText += '\n' + decompressed.toString('utf-8');
      } catch (e) {
        decompressedText += '\n' + rawStream;
      }
    } else {
      decompressedText += '\n' + rawStream;
    }
  }

  const fullText = decompressedText + '\n' + bufferString;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = fullText.match(emailRegex) || [];

  console.log('Unique emails found in data1.pdf:', [...new Set(emails.map(e => e.toLowerCase()))]);
  console.log('Total email count in data1.pdf:', emails.length);
}

inspectPdf('/Users/it4/Downloads/data1.pdf');
