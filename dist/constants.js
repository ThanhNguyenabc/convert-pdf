"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resamplePDF = exports.ChormeArgs = exports.TIME_OUT = exports.PROD_URL = exports.PORT = void 0;
exports.PORT = 3002;
exports.PROD_URL = "https://lmstest.ila.edu.vn";
exports.TIME_OUT = 1800000;
exports.ChormeArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--font-render-hinting=none",
    "--disable-web-security",
    "--devtools=false",
];
function executeCommand(cmd, parameters) {
    const spawnSync = require("child_process").spawnSync;
    const result = spawnSync(cmd, parameters, {
        cwd: process.cwd(),
        env: process.env,
        stdio: "pipe",
        encoding: "utf-8",
    });
    return !result.stdout && !result.stderr && !result.error;
}
const resamplePDF = (source_pdf, output_file, res) => executeCommand("gs", [
    "-sDEVICE=pdfwrite",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-dDetectDuplicateImages=true",
    "-dDownsampleColorImages=true",
    "-dDownsampleGrayImages=true",
    "-dDownsampleMonoImages=true",
    `-dColorImageResolution=${res}`,
    `-dGrayImageResolution=${res}`,
    `-dMonoImageResolution=${res}`,
    `-sOutputFile=${output_file}`,
    source_pdf,
]);
exports.resamplePDF = resamplePDF;
