import fs from "fs";
import * as fflate from "fflate";
import mammoth from "mammoth";

async function testDocxParsing(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(fileBuffer);
  
  console.log("=== TESTING FFLATE ZIP EXTRACTION ===");
  try {
    const unzipped = fflate.unzipSync(uint8);
    const docXmlKey = Object.keys(unzipped).find((k) => k.endsWith("word/document.xml"));
    if (docXmlKey && unzipped[docXmlKey]) {
      const xmlText = fflate.strFromU8(unzipped[docXmlKey]);
      console.log("Found word/document.xml! Length:", xmlText.length);
      console.log("XML Snippet:", xmlText.substring(0, 300));
    } else {
      console.log("word/document.xml not found in zip keys:", Object.keys(unzipped));
    }
  } catch (err) {
    console.error("fflate error:", err);
  }
}

testDocxParsing("./sample_import_document.docx").catch(console.error);
