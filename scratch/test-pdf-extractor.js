const fs = require('fs');

/**
 * Extracts plain text from an uncompressed or standard PDF binary buffer
 */
function extractTextFromPdfBuffer(buffer) {
  const content = buffer.toString('binary');
  const textMatches = [];

  // Match Tj and TJ text operators in PDF streams
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(content)) !== null) {
    textMatches.push(match[1]);
  }

  // Match array TJ operators e.g. [ (text1) -10 (text2) ] TJ
  const tjArrayRegex = /\[\s*((?:\((?:[^)]+)\)\s*|-?\d+\s*)+)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(content)) !== null) {
    const inner = match[1];
    const strRegex = /\(([^)]+)\)/g;
    let strMatch;
    let combined = '';
    while ((strMatch = strRegex.exec(inner)) !== null) {
      combined += strMatch[1];
    }
    if (combined) textMatches.push(combined);
  }

  return textMatches;
}

console.log('PDF Extractor helper test ready');
