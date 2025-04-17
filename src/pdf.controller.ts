import { Request, Response } from "express";
import puppeteer from "puppeteer";
import { ChormeArgs, TIME_OUT } from "./constants";
import fs from "fs";
import sharp from "sharp";
import minifyHtml from "@minify-html/node";
import { createHash } from "crypto";
import path from "path";
import { sanitizeHTML } from "./string_helper";

async function generatePDFfromHTML(htmlContent: string, outputPath: string) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ChormeArgs,
      timeout: TIME_OUT,
      protocolTimeout: 0,
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    const imageCache = new Map<string, Buffer>();

    page.on("request", async (req) => {
      if (req.resourceType() !== "image") {
        req.continue();
        return;
      }

      try {
        const cacheKey = req.url();

        let imageBuffer: Buffer | undefined = imageCache.get(cacheKey);

        if (!imageBuffer) {
          const response = await fetch(req.url(), {
            method: req.method(),
            headers: req.headers(),
          });

          const buffer = Buffer.from(await response.arrayBuffer());

          if (buffer.byteLength > 100000) {
            imageBuffer = await sharp(buffer)
              .webp({
                alphaQuality: 100,
                quality: 80, // Reduce quality to 80%
              })
              .resize({
                width: 800,
                withoutEnlargement: true,
              }) // Resize if larger than 800px
              .toBuffer();
          } else {
            imageBuffer = buffer;
          }
        }
        req.respond({ body: imageBuffer });
      } catch {
        req.continue();
      }
    });

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 0,
    });

    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      path: outputPath,
      displayHeaderFooter: false,
      format: "A4",
      width: "210mm",
      timeout: TIME_OUT,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      printBackground: true,
    });
    await page.close();
    return pdf;
  } catch (error) {
    console.log("pdf error:::");
    console.log(error);
    return null;
  }
}

const convertHtmlToPdf = async (req: Request, res: Response) => {
  let {
    htmlContent = "",
    fileName,
    type = "blob",
    domain = "",
  } = req.body["data"] || {};

  if (domain[domain.length - 1] === "/") {
    domain = domain.slice(0, -1);
  }

  const htmlPage = await sanitizeHTML(domain, htmlContent);
  try {
    const minifyHtmlPage = minifyHtml.minify(Buffer.from(htmlPage), {
      minify_css: true,
    });
    const html = minifyHtmlPage.toString("utf-8");

    const hash = createHash("sha256")
      .update(html + domain)
      .digest("hex");

    const pdfFile = path.join("public", `${fileName}_${hash}.pdf`);

    if (fs.existsSync(pdfFile)) {
      return res.download(pdfFile);
    }

  
    console.time("pdf rendering time");
    const pdf = await generatePDFfromHTML(html, pdfFile);
    console.timeEnd("pdf rendering time");

    if (!pdf) {
      return res.status(500).json({
        message: "Can not generating pdf",
      });
    }

    const pdfBuffer = Buffer.from(pdf);
    const headers = new Map();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename=${fileName}.pdf`);
    headers.set("Content-Length", pdfBuffer.length);
    res.setHeaders(headers);
    res.send(pdfBuffer);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

export { convertHtmlToPdf };
