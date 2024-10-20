import express from "express";
import { convertHtmlToPdf } from "./pdf.controller";

const router = express.Router();
router.get("/html-to-pdf", (req, res) => {
  res.send(200).send("<p>some html</p>");
});

router.post("/html-to-pdf", convertHtmlToPdf);
export default router;
