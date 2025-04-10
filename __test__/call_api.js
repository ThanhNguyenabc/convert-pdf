const { readFileSync, writeFileSync } = require("fs");

const htmlContent = readFileSync("abc.html", "utf-8");
const fileName = "PRIMARY_P3A_BOOK";
const data = {
  fileName,
  htmlContent,
  type: "blob",
  domain: "https://contentdev.ila.edu.vn/",
};

fetch("http://localhost:3002/html-to-pdf", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ data }),
})
  .then((res) => res.blob())
  .then(async (blob) => {
    const blobObj = new Blob([blob], { type: "application/pdf" });
    const buffer = await blobObj.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    writeFileSync(`${fileName}.pdf`, nodeBuffer, (err) => {
      if (err) {
        console.error("Error writing file:", err);
      } else {
        console.log("File written successfully");
      }
    });
  });
