import fs from "fs";

export async function testGeminiExtraction(apiKey, pdfPath) {
  if (!apiKey) {
    console.log("No API key provided.");
    return;
  }

  const buf = fs.readFileSync(pdfPath);
  const base64Data = buf.toString("base64");

  const prompt = `You are an expert Registrar AI evaluating academic transcripts and grade sheets for credit evaluation.
Analyze this academic record document and extract all completed/credited subjects in strict JSON format.

The document contains tables with columns such as:
- Subject Code (e.g. Gen Ed 4, EMath 100, Comp 111, EChem 111, EChem 111L, RS 1, PE 1, EMath 111, ROTC 1)
- Title (e.g. Mathematics in the Modern World, Calculus 1, etc.)
- Units (e.g. 3.00, 4.00, 1.00)
- Hours
- Prelim, Midterm, Finals, Average (The subject's final grade is usually under the Average or Finals column, e.g. 2.8, 1.4, 1.0, 3.0, 5.0)

Also look for Academic Year and Semester headers like:
"Semester: AY 2024-2025 1st Semester", "Semester: AY 2024-2025 2nd Semester", etc.

Return ONLY a JSON object with this structure:
{
  "detectedProgram": "string or null",
  "records": [
    {
      "academicYear": "string e.g. 2024-2025",
      "term": "string e.g. 1st Semester, 2nd Semester, Summer",
      "subjectCode": "string e.g. EMATH 111, GEN ED 4",
      "subjectTitle": "string e.g. Calculus 1, Mathematics in the Modern World",
      "units": number e.g. 3 or 4,
      "grade": "string e.g. 2.8, 1.4, 1.0",
      "remarks": "string or null"
    }
  ]
}
Do not include markdown fences. Return pure JSON. Do not include total/summary rows.`;

  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-3.5-flash-lite"];
  for (const model of models) {
    console.log(`Trying model: ${model}...`);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: "application/pdf",
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`Success with ${model}!`);
        console.log(text.slice(0, 500));
        return JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
      } else {
        const errText = await response.text();
        console.log(`Model ${model} failed with status ${response.status}:`, errText.slice(0, 200));
      }
    } catch (e) {
      console.log(`Error calling ${model}:`, e.message);
    }
  }
}

const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const pdfPath = "C:/Users/yohan/.gemini/antigravity-ide/brain/92215b01-cd44-4f99-b93a-51013b6d0144/.user_uploaded/media_1791099666395.pdf";
testGeminiExtraction(key, pdfPath);
