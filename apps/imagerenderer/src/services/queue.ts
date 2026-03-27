import pLimit from 'p-limit';

/**
 * Concurrency limit for image rendering jobs.
 * Prevents overloading the system with too many Puppeteer instances/pages.
 */
export const limit = pLimit(3);
