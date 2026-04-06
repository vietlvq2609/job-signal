import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import chalk from 'chalk';
import fs from 'fs';

// 1. Define the Job structure for your AI
interface Job {
  title: string;
  company: string;
  salary: string;
  description: string;
  experiences: string;
  whyLove: string;
}

async function scrape() {
  const url = 'https://itviec.com/viec-lam-it';

  console.log(chalk.blue('🚀 Launching browser...'));

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  const page: Page = await context.newPage();

  try {
    console.log(chalk.blue('🌐 Navigating to ITviec...'));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('.job-card');

    const jobContentUrls = await page.$$eval('.job-card', (cards) => {
      return cards.map(card => card.getAttribute('data-search--job-selection-job-url-value'));
    });

    const validUrls = jobContentUrls.filter(url => url !== null) as string[];
    console.log(chalk.yellow(`Found ${validUrls.length} content links. Navigating directly...`));

    const results = [];

    for (const partialUrl of validUrls) {
      const fullUrl = `${url}${partialUrl}`;
      console.log(chalk.gray(`Fetching: ${fullUrl}`));

      // Navigate directly to the content page
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

      // 3. Extract the data (The structure here is usually simpler/cleaner)
      const data = await page.evaluate(() => {
        const getTxt = (s: string) => document.querySelector(s)?.textContent?.trim() || '';

        return {
          title: getTxt('h3'),
          salary: getTxt('.salary > span'),
          description: getTxt('.job-description'),
          experiences: getTxt('.job-experiences'),
          whyLove: getTxt('.job-why-love-working')
        };
      });

      results.push(data);

      // Safety: Save HTML if data is missing for a specific link
      if (!data.description) {
        fs.writeFileSync('logs/failed-capture.html', await page.content());
      }
    }

    // Final output for your AI workflow
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error(chalk.red('❌ Scraping failed:'), (error as Error).message);
    console.log(chalk.red('Timeout reached! Saving evidence...'));
    // Save a screenshot to see what was on the screen
    await page.screenshot({ path: 'logs/debug-screenshot.png' });
    // Save the HTML to see if the selector exists under a different name
    const html = await page.content();
    fs.writeFileSync('logs/debug-page.html', html);
    throw error;
  } finally {
    await browser.close();
    console.log(chalk.gray('Browser closed.'));
  }
}

scrape();