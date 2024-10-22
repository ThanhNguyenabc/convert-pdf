import { Request, Response } from "express";
import puppeteer from "puppeteer";
import { PORT, PROD_URL } from "./constants";

async function generatePDFfromHTML(
  cssLinks: string[],
  htmlContent: string,
  outputPath: string
) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(1800000);
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
    cssLinks = [],
    htmlContent = "",
    fileName,
    domain = "",
  } = req.body["data"] || {};

  cssLinks = cssLinks.map((item: string) => `${PROD_URL}${item}`);

  //replace url with absolute path
  htmlContent = htmlContent = htmlContent.replaceAll(
    /\(content\/|"content\//g,
    (string: string) => {
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
    const pdf = await generatePDFfromHTML(cssLinks, htmlContent, pathFile);

    const url = `http://${process.env.FILE_URL}:${PORT}/${fileName}`;

    console.log("finish");
    return res.status(200).json({
      fileName,
      url,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

export { convertHtmlToPdf };
