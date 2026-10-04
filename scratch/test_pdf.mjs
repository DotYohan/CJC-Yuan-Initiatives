import fs from "fs";
import zlib from "zlib";

function cleanPdfString(s) {
  return s
    .replace(/\\\\/g, "\\")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

export function extractTextFromPdf(buffer) {
  const str = buffer.toString("latin1");
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  const extractedLines = [];

  while ((match = streamRegex.exec(str)) !== null) {
    const rawStream = Buffer.from(match[1], "latin1");
    let decompressed;
    try {
      decompressed = zlib.inflateSync(rawStream);
    } catch {
      try {
        decompressed = zlib.inflateRawSync(rawStream);
      } catch {
        try {
          decompressed = zlib.unzipSync(rawStream);
        } catch {
          decompressed = rawStream;
        }
      }
    }
    const text = decompressed.toString("latin1");

    // Look for text blocks BT ... ET
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(text)) !== null) {
      const block = btMatch[1];
      const tjRegex = /(?:\((.*?)\)\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ)/g;
      let tjMatch;
      let lineText = "";
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        if (tjMatch[1] !== undefined) {
          lineText += cleanPdfString(tjMatch[1]);
        } else if (tjMatch[2] !== undefined) {
          const arrayContent = tjMatch[2];
          const itemRegex = /\((.*?)\)/g;
          let itemMatch;
          while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
            lineText += cleanPdfString(itemMatch[1]);
          }
        }
      }
      if (lineText.trim()) {
        extractedLines.push(lineText.trim());
      }
    }
  }
  return extractedLines;
}

const pdfPath = "C:/Users/yohan/.gemini/antigravity-ide/brain/92215b01-cd44-4f99-b93a-51013b6d0144/.user_uploaded/media_1791099666395.pdf";
const buf = fs.readFileSync(pdfPath);
const lines = extractTextFromPdf(buf);
console.log("Extracted lines count:", lines.length);
if (lines.length > 0) {
  console.log("Sample lines:", lines.slice(0, 10));
}
