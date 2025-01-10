"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHtmlToPdf = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const constants_1 = require("./constants");
const fs_1 = __importDefault(require("fs"));
const adm_zip_1 = __importDefault(require("adm-zip"));
function generatePDFfromHTML(cssLinks, htmlContent, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: constants_1.ChormeArgs,
            timeout: constants_1.TIME_OUT,
            protocolTimeout: constants_1.TIME_OUT,
        });
        const page = yield browser.newPage();
        page.setRequestInterception(true);
        // Track failed requests
        page.on("requestfailed", (request) => {
            console.log("Request failed:", request.url());
        });
        // Track responses
        page.on("response", (response) => {
            if (!response.ok()) {
                console.log("Response failed:", response.url(), "Status:", response.status());
            }
        });
        yield page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36");
        page.setDefaultTimeout(constants_1.TIME_OUT);
        const externalCss = cssLinks === null || cssLinks === void 0 ? void 0 : cssLinks.map((item) => page.addStyleTag({
            url: item,
        }));
        yield Promise.all(externalCss);
        yield page.setContent(htmlContent, {
            waitUntil: "load",
            timeout: constants_1.TIME_OUT,
        });
        yield page.emulateMediaType("screen");
        const pdf = yield page.pdf({
            path: outputPath,
            displayHeaderFooter: false,
            format: "A4",
            width: "210mm",
            timeout: constants_1.TIME_OUT,
            printBackground: true,
            height: "297mm",
        });
        yield page.close();
        return pdf;
    });
}
const convertHtmlToPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { htmlContent = "", fileName, type = "url", domain = "", } = req.body["data"] || {};
    if (domain[domain.length - 1] === "/") {
        domain = domain.slice(0, -1);
    }
    const cssLinks = [
        "http://127.0.0.1:3002/css/client.css",
        "http://127.0.0.1:3002/css/style.css",
    ];
    //replace url with absolute path
    htmlContent = htmlContent.replaceAll(/\(content\/|"content\/|https:\/\/dev\.ila\.edu\.vn\.lms\.contdev/g, (string) => {
        if (string.includes("https")) {
            return domain;
        }
        return string.replace("content", `${domain}/content`);
    });
    htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${cssLinks === null || cssLinks === void 0 ? void 0 : cssLinks.map((link) => `<link
      rel="stylesheet"
      type="text/css"
      href="${link}"
    />`).join(" ")}

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
        const pathFile = `public/${fileName}.pdf`;
        fs_1.default.writeFile("public/data.html", htmlContent, () => { });
        const pdf = yield generatePDFfromHTML(cssLinks, htmlContent, pathFile);
        if (type === "blob") {
            const zip = new adm_zip_1.default();
            zip.addLocalFile(pathFile);
            const zipBuffer = zip.toBuffer();
            const headers = new Map();
            headers.set("Content-Type", "application/zip");
            headers.set("Content-Disposition", `attachment; filename=${fileName}.zip`);
            headers.set("Content-Length", zipBuffer.length);
            res.setHeaders(headers);
            res.send(zipBuffer);
        }
        else {
            const url = `http://${process.env.FILE_URL}:${constants_1.PORT}/${fileName}.pdf`;
            return res.status(200).json({
                fileName,
                url,
            });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).send(error);
    }
});
exports.convertHtmlToPdf = convertHtmlToPdf;
