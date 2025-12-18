import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// PDF generation route
app.post("/generate-pdf", async (req, res) => {
  const { html, fileName } = req.body;

  if (!html) {
    return res.status(400).json({ error: "HTML is required" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Ensure fonts & external styles are fully loaded
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    // ✅ Correct headers (NO Content-Length)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName || "document.pdf"}"`
    );

    // ✅ Send buffer safely
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "PDF generation failed" });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Health check (optional but useful for Render)
app.get("/", (req, res) => {
  res.send("PDF server running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PDF server running on port ${PORT}`);
});
