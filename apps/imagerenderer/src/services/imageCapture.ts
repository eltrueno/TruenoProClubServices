import { Page } from "puppeteer";
import fs from "fs";
import path from "path";
import { getBrowser } from "./browser";
import { limit } from "./queue";

const captureImage = async (
  url: string,
  filename: string,
  selector?: string,
  width = 1280,
  height = 720
): Promise<string | Buffer> => {
  // Wrap the entire capturing logic in the concurrency limit
  return limit(async () => {
    let page: Page | null = null;
    try {
      const browser = await getBrowser();
      page = await browser.newPage();

      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 1
      });

      await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' }
      ]);

      console.log(`[ImageCapture] Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

      const dir = path.join(__dirname, "../../imagescache");
      const filepath = path.join(dir, `${filename}.jpeg`);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let screenshotBuffer: Buffer;

      if (!selector) {
        screenshotBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 90
        }) as Buffer;
      } else {
        const elem = await page.waitForSelector(selector, { timeout: 10000 });
        if (!elem) {
          throw new Error(`Selector '${selector}' not found`);
        }
        screenshotBuffer = await elem.screenshot({
          type: 'jpeg',
          quality: 90
        }) as Buffer;
      }

      // Save to cache as well
      fs.writeFileSync(filepath, screenshotBuffer);

      return screenshotBuffer;
    } catch (e) {
      console.error('[ImageCapture] Error:', e);
      throw e;
    } finally {
      if (page) {
        await page.close();
      }
    }
  });
};

export { captureImage };
