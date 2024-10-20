import express from "express";
import { convertHtmlToPdf } from "./pdf.controller";

const router = express.Router();
router.post("/html-to-pdf", convertHtmlToPdf);
export default router;
