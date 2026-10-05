import fs from 'fs';

async function testPdfJs(pdfPath) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data: data });
    const pdfDocument = await loadingTask.promise;
    console.log('PDF loaded, numPages:', pdfDocument.numPages);

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      console.log(`Page ${pageNum} text length:`, pageText.length);
      fullText += `\n--- PAGE ${pageNum} ---\n` + pageText;
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set((fullText.match(emailRegex) || []).map(e => e.toLowerCase()))];
    console.log(`Extracted ${emails.length} unique emails using pdfjs-dist:`, emails);
  } catch (err) {
    console.error('Error in pdfjs test:', err);
  }
}

testPdfJs('/Users/it4/Downloads/data1.pdf');
