import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/generate-pdf", async (req, res) => {
  const { html, fileName } = req.body;

  if (!html) {
    return res.status(400).json({ error: "HTML is required" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName || "Resume.pdf"}"`
    );

    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "PDF generation failed" });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/", (req, res) => {
  res.send("PDF server running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PDF server running on port ${PORT}`);
});
