import sharp from "sharp";

export async function processImage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log("cancel imagess");
    controller.abort();
  }, 180000);

  try {
    const imageResponse = await fetch(url, { signal: controller.signal });

    if (!imageResponse.ok) {
      console.warn(`[Image] Failed to fetch ${url}: ${imageResponse.status}`);
      return null; // Return null on error
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    const img = sharp(Buffer.from(imageBuffer), {
      sequentialRead: true,
    });

    const metadata = await img.metadata();
    const { width = 0 } = metadata;

    // Always resize for PDF (smaller = better for web display in PDF)
    // 600px is optimal for PDF readability without excessive file size
    if (width < 600) {
      // Image already small - just convert to WebP for compression
      return img
        .webp({
          quality: 70, // 70-85 is optimal (higher = better quality/larger file)
          alphaQuality: 100,
          effort: 6, // Max compression (0-6, higher = slower but smaller)
          nearLossless: false,
        })
        .toBuffer();
    }

    // Resize to 600px max width
    const result = await img
      .resize({
        width: 600,
        withoutEnlargement: true,
        fit: "inside",
        position: "center",
      })
      .webp({
        quality: 70,
        alphaQuality: 100,
        effort: 6, // High effort = better compression
        nearLossless: false,
      })
      .toBuffer();

    return result;
  } catch (error) {
    console.error(
      `[Image] Error processing ${url}`,
      error instanceof Error ? error.message : error,
    );
    return null; // Return null instead of empty buffer
  } finally {
    clearTimeout(timeout);
  }
}
