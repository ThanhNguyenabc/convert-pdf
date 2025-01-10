import { Request, Response } from "express";
import puppeteer from "puppeteer";
import { ChormeArgs, PORT, TIME_OUT } from "./constants";
import fs from "fs";
import AdmZip from "adm-zip";
import htmlMinifier from "@node-minify/html-minifier";
import minify from "@node-minify/core";

const cssLinks = [
  "http://127.0.0.1:3002/css/client.css",
  "http://127.0.0.1:3002/css/style.css",
];

async function generatePDFfromHTML(
  cssLinks: string[],
  htmlContent: string,
  outputPath: string
) {
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

    const externalCss = cssLinks?.map((item) =>
      page.addStyleTag({
        path: item,
      })
    );
    await Promise.all(externalCss).catch((error) => {
      console.log(error);
    });

    await page.setContent(htmlContent, {
      waitUntil: "load",
      timeout: 0,
    });

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
    type = "url",
    domain = "",
  } = req.body["data"] || {};

  if (domain[domain.length - 1] === "/") {
    domain = domain.slice(0, -1);
  }

  //replace url with absolute path

  htmlContent = htmlContent.replaceAll(
    /\(content\/|"content\/|https:\/\/dev\.ila\.edu\.vn\.lms\.contdev/g,
    (string: string) => {
      if (string.includes("https")) {
        return domain;
      }
      return string.replace("content", `${domain}/content`);
    }
  );
  htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${cssLinks
  ?.map(
    (link: string) => `<link
      rel="stylesheet"
      type="text/css"
      href="${link}"
    />`
  )
  .join(" ")}

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
    const htmlFile = "public/data.html";

    const minifiedHTML =
      ((await minify({
        compressor: htmlMinifier,
        content: htmlContent,
      })) as string) || "";

    fs.writeFile(htmlFile, minifiedHTML, () => {});

    const pdf = await generatePDFfromHTML(
      ["public/css/client.css", "public/css/style.css"],
      minifiedHTML,
      pdfFile
    );

    if (!pdf) {
      return res.status(500).json({
        message: "Can not generating pdf",
      });
    }

    if (type === "blob") {
      const zip = new AdmZip();
      zip.addFile(`${fileName}.pdf`, Buffer.from(pdf));

      const zipBuffer = zip.toBuffer();
      const headers = new Map();
      headers.set("Content-Type", "application/zip");
      headers.set(
        "Content-Disposition",
        `attachment; filename=${fileName}.zip`
      );
      headers.set("Content-Length", zipBuffer.length);
      res.setHeaders(headers);
      res.send(zipBuffer);
      // fs.unlinkSync(htmlFile);
      fs.unlinkSync(pdfFile);
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
