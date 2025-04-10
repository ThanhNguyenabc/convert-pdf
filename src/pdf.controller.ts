import { Request, Response } from "express";
import puppeteer from "puppeteer";
import { ChormeArgs, PORT, TIME_OUT } from "./constants";
import fs from "fs";
import sharp from "sharp";

async function generatePDFfromHTML(htmlContent: string, outputPath: string) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ChormeArgs,
      timeout: TIME_OUT,
      protocolTimeout: 0,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
    );

    // Set interception to handle image requests

    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      if (req.resourceType() !== "image") {
        req.continue();
        return;
      }
      try {
        const response = await fetch(req.url(), {
          method: req.method(),
          headers: req.headers(),
        });
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 100000) {
          const resizedImage = await sharp(buffer)
            .resize({
              width: 800,
              withoutEnlargement: true,
            }) // Resize if larger than 800px
            .png({
              quality: 86, // Reduce quality to 80%
              compressionLevel: 9, // Max compression (0-9)
            })
            .toBuffer();
          req.respond({ body: resizedImage });
        } else {
          req.continue();
        }
      } catch {
        req.continue();
      }
    });

    await page.setContent(htmlContent, {
      waitUntil: "load",
      timeout: 0,
    });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      path: outputPath,
      displayHeaderFooter: false,
      format: "A4",
      width: "210mm",
      timeout: TIME_OUT,
      printBackground: true,
      height: "297mm",
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

  htmlContent = htmlContent.replace(
    /\(content\/|"content\/|/g,
    (string: string) => {
      if (string.includes("https")) {
        return domain;
      }
      return string.replace("content", `${domain}/content`);
    }
  );

  const [clientCss, styleCss] = await Promise.all([
    fs.promises.readFile("public/css/client.css", "utf-8"),
    fs.promises.readFile("public/css/style.css", "utf-8"),
  ]);

  const htmlPage = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${clientCss}</style>
    <style>${styleCss}</style>
    <style>
      body {
        overflow: auto;
        height: 100%;
        margin: 0;
      }
    </style>
  </head>
  <body>${htmlContent}</body>
</html>`;

  try {
    const pdfFile = `public/${fileName}.pdf`;
    fs.writeFile("public/data.html", htmlPage, () => {});

    console.time("pdf time");
    const pdf = await generatePDFfromHTML(htmlPage, pdfFile);
    console.timeEnd("pdf time");

    if (!pdf) {
      return res.status(500).json({
        message: "Can not generating pdf",
      });
    }

    const pdfBuffer = Buffer.from(pdf);

    if (type === "blob") {
      const headers = new Map();
      headers.set("Content-Type", "application/pdf");
      headers.set(
        "Content-Disposition",
        `attachment; filename=${fileName}.pdf`
      );
      headers.set("Content-Length", pdfBuffer.length);
      res.setHeaders(headers);
      res.send(pdfBuffer);
    } else {
      const url = `http://${process.env.FILE_URL}:${PORT}/${fileName}.pdf`;
      return res.status(200).json({
        fileName,
        url,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

export { convertHtmlToPdf };
