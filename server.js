import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();

// ✅ Fix: Explicit JSON and raw body parsing for Express 5
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const PORT = process.env.PORT || 5000;

let browser;

// 🔹 Initialize Puppeteer
async function initBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    console.log("🟢 Puppeteer browser launched");
  } catch (err) {
    console.error("❌ Failed to launch browser:", err);
  }
}

// 🔹 Close browser safely
async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      console.log("🔴 Puppeteer browser closed");
    }
  } catch (err) {
    console.error("Error closing browser:", err);
  }
}

// 🔹 Graceful shutdown
process.on("exit", closeBrowser);
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit();
});
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit();
});

// 🔹 PDF API
app.post("/generate-pdf", async (req, res) => {
  // ✅ Fix: Guard against undefined body
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid or missing JSON body" });
  }

  const { html, fileName } = req.body;

  if (!html) {
    return res.status(400).json({ error: "HTML is required" });
  }

  let page;

  try {
    if (!browser) {
      console.log("⚠️ Browser not initialized. Launching...");
      await initBrowser();
    }

    page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    // ✅ Sanity check
    const header = pdfBuffer.slice(0, 4).toString();
    if (header !== "%PDF") {
      console.error("❌ Invalid PDF buffer, header:", header);
      return res.status(500).json({ error: "Generated file is not a valid PDF" });
    }

    console.log("✅ PDF generated successfully, size:", pdfBuffer.length, "bytes");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName || "file"}.pdf"`,
      "Content-Length": pdfBuffer.length,
      "Cache-Control": "no-store",
    });

    res.end(pdfBuffer);

  } catch (err) {
    console.error("❌ PDF generation failed:");
    console.error(err.message);
    console.error(err.stack);

    res.status(500).json({
      error: "PDF generation failed",
      details: err.message,
    });

  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (closeErr) {
      console.error("⚠️ Error closing page:", closeErr);
    }
  }
});

// 🔹 Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", browser: !!browser });
});

// 🔹 Start server AFTER browser init
(async () => {
  await initBrowser();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 PDF server running on http://0.0.0.0:${PORT}`);
  });
})();