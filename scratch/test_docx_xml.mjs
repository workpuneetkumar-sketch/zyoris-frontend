import fs from "fs";
import * as fflate from "fflate";

function parseOpenXmlToHtml(docXmlText) {
  // Simple, resilient OpenXML to HTML converter for Word document.xml
  const htmlParts = [];
  
  // Extract paragraphs <w:p> and tables <w:tbl>
  const blockRegex = /<(w:p|w:tbl)[\s\S]*?<\/\1>/g;
  let match;

  while ((match = blockRegex.exec(docXmlText)) !== null) {
    const blockText = match[0];
    const tagName = match[1];

    if (tagName === "w:tbl") {
      // Parse Table
      const rows = [];
      const trRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
      let trMatch;
      while ((trMatch = trRegex.exec(blockText)) !== null) {
        const rowCells = [];
        const tcRegex = /<w:tc[\s\S]*?<\/w:tc>/g;
        let tcMatch;
        while ((tcMatch = tcRegex.exec(trMatch[0])) !== null) {
          const cellTextMatches = tcMatch[0].match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
          const cellText = cellTextMatches
            .map((t) => t.replace(/<[^>]+>/g, ""))
            .join("")
            .trim();
          rowCells.push(cellText);
        }
        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
      }
      if (rows.length > 0) {
        const trHtml = rows
          .map((r, i) =>
            `<tr>${r.map((c) => `<${i === 0 ? "th" : "td"}>${escapeHtml(c)}</${i === 0 ? "th" : "td"}>`).join("")}</tr>`
          )
          .join("");
        htmlParts.push(`<table>${trHtml}</table>`);
      }
    } else if (tagName === "w:p") {
      // Check style for heading level
      const styleMatch = blockText.match(/<w:pStyle w:val="([^"]+)"/);
      const styleVal = styleMatch ? styleMatch[1].toLowerCase() : "";
      
      // Extract text content from <w:t> tags
      const textMatches = blockText.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      const textContent = textMatches
        .map((t) => t.replace(/<[^>]+>/g, ""))
        .join("")
        .trim();

      if (!textContent) continue;

      if (styleVal.includes("heading1") || styleVal.includes("heading 1")) {
        htmlParts.push(`<h1>${escapeHtml(textContent)}</h1>`);
      } else if (styleVal.includes("heading2") || styleVal.includes("heading 2")) {
        htmlParts.push(`<h2>${escapeHtml(textContent)}</h2>`);
      } else if (styleVal.includes("heading3") || styleVal.includes("heading 3")) {
        htmlParts.push(`<h3>${escapeHtml(textContent)}</h3>`);
      } else if (styleVal.includes("bullet") || /^[\u2022\u25cf\u2023\-*+]\s*/.test(textContent)) {
        const cleanText = textContent.replace(/^[\u2022\u25cf\u2023\-*+]\s*/, "");
        htmlParts.push(`<ul><li>${escapeHtml(cleanText)}</li></ul>`);
      } else if (styleVal.includes("number") || /^\d+[\.\)]\s*/.test(textContent)) {
        const cleanText = textContent.replace(/^\d+[\.\)]\s*/, "");
        htmlParts.push(`<ol><li>${escapeHtml(cleanText)}</li></ol>`);
      } else {
        htmlParts.push(`<p>${escapeHtml(textContent)}</p>`);
      }
    }
  }

  return htmlParts.join("");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function testXmlParser(filePath) {
  const fileBuf = fs.readFileSync(filePath);
  const unzipped = fflate.unzipSync(new Uint8Array(fileBuf));
  const docKey = Object.keys(unzipped).find((k) => k.endsWith("word/document.xml"));
  const xmlText = fflate.strFromU8(unzipped[docKey]);
  const html = parseOpenXmlToHtml(xmlText);
  console.log(`=== PARSED OPENXML HTML FOR ${filePath} ===`);
  console.log(html);
}

async function main() {
  await testXmlParser("./sample_import_document.docx");
  await testXmlParser("./sample_table_document.docx");
}

main().catch(console.error);
