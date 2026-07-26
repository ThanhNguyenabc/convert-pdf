import { Request, Response } from "express";
import { Page } from "puppeteer";
import { Default_Response_Error, TIME_OUT } from "./constants";
import fs from "fs";
import minifyHtml from "@minify-html/node";
import path from "path";
import { sanitizeHTML } from "./string_helper";
import { browserInstance, initBrowser } from "./cluster_manager";
import { processImage } from "./image_helper";
import { promisify } from "util";
import { execFile } from "child_process";
const execFileAsync = promisify(execFile);

async function generatePDFfromHTML(htmlContent: string, outputPath: string) {
  let page: Page | null = null;
  let imageCache: Map<string, Promise<Buffer | null>> | null = new Map();
  // let requestHandler: any = null;
  let errorHandler: any = null;
  let pageErrorHandler: any = null;

  try {
    if (!browserInstance) {
      console.log("init browser");
      await initBrowser();
    }
    if (!browserInstance) return null;

    page = await browserInstance.newPage();

    // Set memory limits
    page.setDefaultNavigationTimeout(0); // 2 minutes
    page.setDefaultTimeout(0); // 2 minutes

    // await page.setRequestInterception(true);

    // Store handlers for cleanup
    errorHandler = (error: Error) =>
      console.error("Page error:", error.message);
    pageErrorHandler = (error: Error) =>
      console.error("Page error:", error.message);

    // requestHandler = async (req: any) => {
    //   try {
    //     if (req.resourceType() !== "image") {
    //       return req.continue();
    //     }

    //     const cacheKey = req.url();
    //     let imagePromise = imageCache?.get(cacheKey);
    //     if (!imagePromise) {
    //       imagePromise = processImage(cacheKey);
    //       imageCache?.set(cacheKey, imagePromise);
    //     }

    //     const image = await imagePromise;

    //     // If image processing failed (null), let Puppeteer load it normally
    //     if (!image) {
    //       return req.continue();
    //     }

    //     await req.respond({
    //       body: image,
    //       contentType: "image/webp",
    //     });
    //   } catch (error) {
    //     console.error(
    //       `[Request] Error handling image request:`,
    //       error instanceof Error ? error.message : error,
    //     );
    //     try {
    //       await req.continue();
    //     } catch (e) {
    //       // Request already handled
    //     }
    //   }
    // };

    page.on("error", errorHandler);
    page.on("pageerror", pageErrorHandler);
    // page.on("request", requestHandler);

    page.emulateMediaType("screen");

    await page.setContent(htmlContent, {
      waitUntil: "domcontentloaded",
      timeout: 0,
    });
    await Promise.all([
      page.evaluate(() => document.fonts.ready),
      page.waitForFunction(
        () => Array.from(document.images).every((img) => img.complete),
        { timeout: 0 },
      ),
    ]);

    await page.pdf({
      path: outputPath,
      format: "A4",
      // width: "210mm",
      displayHeaderFooter: false,
      timeout: TIME_OUT,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      printBackground: true,
    });

    return true;
  } catch (error) {
    console.log("rendering pdf error:", error);
    return null;
  } finally {
    // Proper cleanup
    if (page) {
      try {
        // Remove all listeners
        if (errorHandler) page.off("error", errorHandler);
        if (pageErrorHandler) page.off("pageerror", pageErrorHandler);
        // if (requestHandler) page.off("request", requestHandler);
        // Disable request interception
        // await page.setRequestInterception(false).catch(() => {});

        // Close page and wait for it
        await page.close();
      } catch (error) {
        console.error("Error during page cleanup:", error);
      }
    }

    // Clear cache
    if (imageCache) {
      imageCache.clear();
      imageCache = null;
    }
    page = null;
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

  let pdfFile: string;
  let html: string | null = null;

  try {
    // Scope htmlPage and minifyHtmlPage to minimize memory footprint
    {
      const htmlPage = await sanitizeHTML(domain, htmlContent);
      const minifyHtmlPage = minifyHtml.minify(Buffer.from(htmlPage), {
        minify_css: true,
      });

      html = minifyHtmlPage.toString("utf-8");

      pdfFile = path.join("public", `${fileName}.pdf`);
    }

    const pdfFileOptimized = `${pdfFile}_compress.pdf`;
    if (fs.existsSync(pdfFileOptimized)) {
      html = null; // Clear before returning
      return res.download(pdfFileOptimized);
    }

    // Generate PDF - only html string in memory during this operation
    let isRenderSuccess: boolean | null = null;
    try {
      isRenderSuccess = await generatePDFfromHTML(html, pdfFile);
      await execFileAsync("pdfcpu", ["optimize", pdfFile, pdfFileOptimized]);
    } finally {
      // Clear HTML immediately after PDF generation - no longer needed
      html = null;
    }

    if (!isRenderSuccess) {
      return res.status(500).json(Default_Response_Error);
    }

    // Set headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}.pdf`,
    );

    res.on("close", async () => {
      Promise.all([
        fs.promises.rm(pdfFile, { force: true }),
        fs.promises.rm(pdfFileOptimized, { force: true }),
      ]);
    });

    fs.createReadStream(pdfFileOptimized).pipe(res);
  } catch (error) {
    html = null; // Cleanup on error

    return res.status(500).send(error);
  }
};

export { convertHtmlToPdf };
