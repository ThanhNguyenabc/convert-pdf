import { readFile } from "fs/promises";

export const sanitizeHTML = async (domain: string, htmlContent: string) => {
  htmlContent = htmlContent.replace(
    /\(content\/|"content\/|'content\//g,
    (string: string) => {
      if (string.includes("https")) {
        return domain;
      }
      return string.replace("content", `${domain}/content`);
    }
  );

  const css = await Promise.all([
    readFile("public/css/common.css", "utf-8"),
    readFile("public/css/bookpage.css", "utf-8"),
  ]);

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${css.map((item) => `<style>${item}</style>`).join("")}
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
};
