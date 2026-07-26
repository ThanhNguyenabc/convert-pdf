import puppeteer, { Browser } from "puppeteer";
import { ChormeArgs, TIME_OUT } from "./constants";

let browserInstance: Browser | null = null;
let memoryCleanupInterval: NodeJS.Timeout | null = null;

export const initBrowser = async () => {
  if (browserInstance) return browserInstance;

  try {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ChormeArgs,
      timeout: TIME_OUT,
      protocolTimeout: 0,
    });
    console.log("Browser initialized - supports concurrent pages");

    // Start memory cleanup interval
    startMemoryCleanup();

    return browserInstance;
  } catch (error) {
    console.error("Failed to initialize browser:", error);
    throw error;
  }
};

const startMemoryCleanup = () => {
  if (memoryCleanupInterval) return;

  memoryCleanupInterval = setInterval(async () => {
    if (!browserInstance) return;

    try {
      // const pages = await browserInstance.pages();
      // console.log(`[Memory] Current pages: ${pages.length}`);

      // Force garbage collection every 30s if V8 supports it
      if (global.gc) {
        global.gc();
        console.log("[Memory] Garbage collection triggered");
      }

      // Get memory usage
      // const metrics = process.memoryUsage();
      // console.log("[Memory]", {
      //   heapUsed: Math.round(metrics.heapUsed / 1024 / 1024) + "MB",
      //   heapTotal: Math.round(metrics.heapTotal / 1024 / 1024) + "MB",
      //   rss: Math.round(metrics.rss / 1024 / 1024) + "MB",
      // });
    } catch (error) {
      console.error("Memory cleanup error:", error);
    }
  }, 60000); // Every 60 seconds
};

export const stopMemoryCleanup = () => {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval);
    memoryCleanupInterval = null;
    console.log("Memory cleanup stopped");
  }
};

export const cleanBrowser = async () => {
  stopMemoryCleanup();

  if (browserInstance) {
    try {
      // Close all pages explicitly
      const pages = await browserInstance.pages();
      for (const page of pages) {
        try {
          await page.close();
        } catch (e) {
          console.error("Error closing page:", e);
        }
      }

      await browserInstance.close();
    } catch (error) {
      console.error("Error closing browser:", error);
    }
    browserInstance = null;
    console.log("Browser closed");
  }
};

// Initialize browser on startup
initBrowser().catch((error) => {
  console.error("Failed to start browser:", error);
  process.exit(1);
});

export { browserInstance };
