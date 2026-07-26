const { readFileSync, writeFileSync } = require("fs");

const batchRender = async () => {
  // setInterval(()=>{})
  const books = [
    "abc.html",
    "abc 1.html",
    "abc 2.html",
    "abc 3.html",
    "abc 1.html",
  ];
  await Promise.all(
    books.map((item, index) => {
      const htmlContent = readFileSync(item, "utf-8");
      const fileName = `PRIMARY_P3A_BOOK_${item}_${index}`;
      const data = {
        fileName,
        htmlContent,
        type: "blob",
        domain: "https://contentdev.ila.edu.vn/",
      };

      return fetch("http://localhost:3002/html-to-pdf", {
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
    }),
  );
  batchRender();
  console.log("\n");
  console.log("-----------done-----");
};

batchRender();
