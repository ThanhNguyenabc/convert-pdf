export const PORT = 3002;
export const PROD_URL = "https://lmstest.ila.edu.vn";

export const TIME_OUT = 1800000;

function executeCommand(cmd: string, parameters: string[]) {
  const spawnSync = require("child_process").spawnSync;
  const result = spawnSync(cmd, parameters, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return !result.stdout && !result.stderr && !result.error;
}

export const resamplePDF = (
  source_pdf: string,
  output_file: string,
  res: number
) =>
  executeCommand("gs", [
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
