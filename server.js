// server.js
import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json({ limit: "10mb" }));

let browser; // single browser instance

// Launch browser at server startup
async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new", // use headless chromium
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("🟢 Puppeteer browser launched");
}

// Gracefully close browser on exit
process.on("exit", async () => {
  if (browser) await browser.close();
});
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit();
});
process.on("SIGTERM", async () => {
  if (browser) await browser.close();
  process.exit();
});

// PDF endpoint
app.post("/generate-pdf", async (req, res) => {
  const { html, fileName } = req.body;

  if (!html) return res.status(400).json({ error: "HTML is required" });

  let page;
  try {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await page.close();

    // Critical headers for binary PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName || "file"}.pdf"`,
      "Content-Length": pdfBuffer.length,
      "Cache-Control": "no-store",
    });

    res.send(pdfBuffer); // send as binary

  } catch (err) {
    console.error("❌ PDF generation error:", err);
    if (page) await page.close();
    res.status(500).json({ error: "PDF generation failed" });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, async () => {
  await initBrowser();
  console.log(`📄 PDF server running on http://localhost:${PORT}`);
});