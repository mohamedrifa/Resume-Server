// server.js
import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 5000;

app.post("/generate-pdf", async (req, res) => {
  const { html, fileName } = req.body;

  if (!html) {
    return res.status(400).json({ error: "HTML is required" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    // ✅ CRITICAL HEADERS
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length,
    });

    // ✅ SEND BUFFER DIRECTLY
    res.end(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed" });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`PDF server running on http://localhost:${PORT}`);
});
