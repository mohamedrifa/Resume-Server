// server.js
import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 5000;

let browser;

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("🟢 Puppeteer browser launched");
}

// Graceful shutdown
async function closeBrowser() {
  if (browser) await browser.close();
}
process.on("exit", closeBrowser);
process.on("SIGINT", () => { closeBrowser().then(() => process.exit()); });
process.on("SIGTERM", () => { closeBrowser().then(() => process.exit()); });

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

    // ✅ MUST: headers to prevent corruption
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName || "file"}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-store");

    // ✅ Send buffer directly
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    if (page) await page.close();
    res.status(500).json({ error: "PDF generation failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PDF server running on Port: ${PORT}`);
});
