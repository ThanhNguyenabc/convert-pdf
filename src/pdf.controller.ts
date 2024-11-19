import { Request, Response } from "express";
import puppeteer from "puppeteer";
import { PORT, TIME_OUT } from "./constants";
import fs from "fs";
import { PassThrough } from "stream";

async function generatePDFfromHTML(
  cssLinks: string[],
  htmlContent: string,
  outputPath: string
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
      "--disable-web-security",
      "--disable-gpu",
    ],
    timeout: TIME_OUT,
    protocolTimeout: TIME_OUT,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(TIME_OUT);
  const externalCss = cssLinks?.map((item) =>
    page.addStyleTag({
      url: item,
    })
  );
  await Promise.all(externalCss);

  await page.setContent(htmlContent, { waitUntil: "load" });

  await page.emulateMediaType("screen");

  const pdf = await page.pdf({
    path: outputPath,
    displayHeaderFooter: false,
    format: "A4",
    width: "210mm",

    printBackground: true,
    height: "297mm",
  });
  await page.close();
  await browser.close();
  return pdf;
}

const convertHtmlToPdf = async (req: Request, res: Response) => {
  let {
    htmlContent = "",
    fileName,
    type = "url",
    domain = "",
    cssLinks = [],
  } = req.body["data"] || {};

  if (domain[domain.length - 1] === "/") {
    domain = domain.slice(0, -1);
  }

  cssLinks = [
    "http://127.0.0.1:3002/css/client.css",
    "http://127.0.0.1:3002/css/style.css",
  ];

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
    const pathFile = `public/${fileName}`;

    if (process.env.NODE_ENV == "development")
      fs.writeFile("public/data.html", htmlContent, () => {});

    const pdf = await generatePDFfromHTML(cssLinks, htmlContent, pathFile);

    const url = `http://${process.env.FILE_URL}:${PORT}/${fileName}`;

    if (type === "blob") {
      const readStream = new PassThrough();
      readStream.end(pdf);
      res.set("Content-disposition", "attachment; filename=" + fileName);
      res.set("Content-Type", "application/pdf");
      res.status(200);
      return readStream.pipe(res);
    } else {
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
