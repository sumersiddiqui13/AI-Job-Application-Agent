import { By, until } from 'selenium-webdriver';
import { createBrowser, closeBrowser } from './driver.js';

const JOB_CARD_SELECTORS = [
  '.jobs-search-results__list-item',
  '.jobs-search-results-list__list-item',
  '.job-card-container',
  'li[data-occludable-job-id]',
];
const JOB_CARD_SELECTOR = JOB_CARD_SELECTORS.join(', ');

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function jobKey(job) {
  return job.url || `${job.title}|${job.company}|${job.location}`.toLowerCase();
}

async function textFromCard(card, selectors) {
  for (const selector of selectors) {
    try {
      const element = await card.findElement(By.css(selector));
      const value = clean(await element.getText());
      if (value) return value;
    } catch {
      // Try the next known LinkedIn selector.
    }
  }
  return '';
}

async function firstText(driver, selectors) {
  for (const selector of selectors) {
    try {
      const element = await driver.findElement(By.css(selector));
      const value = clean(await element.getText());
      if (value) return value;
    } catch {
      // Try the next selector.
    }
  }
  return '';
}

async function collectPage(driver) {
  await driver.wait(until.elementsLocated(By.css(JOB_CARD_SELECTOR)), 20000);
  const cards = await driver.findElements(By.css(JOB_CARD_SELECTOR));
  const jobs = [];

  for (const card of cards) {
    try {
      const link = await card.findElement(By.css('a[href*="/jobs/view/"]'));
      const url = (await link.getAttribute('href'))?.split('?')[0] || '';
      const title = await textFromCard(card, [
        '.job-card-list__title',
        '.job-card-container__link',
        '.artdeco-entity-lockup__title',
        'a[href*="/jobs/view/"]',
      ]);
      const company = await textFromCard(card, [
        '.artdeco-entity-lockup__subtitle',
        '.job-card-container__company-name',
      ]);
      const location = await textFromCard(card, [
        '.artdeco-entity-lockup__caption',
        '.job-card-container__metadata-item',
      ]);

      if (!url || !title) continue;
      jobs.push({
        jobKey: jobKey({ url, title, company, location }),
        source: 'linkedin',
        url,
        title,
        company,
        location,
        collectedAt: new Date().toISOString(),
      });
    } catch {
      // One malformed card should not abort the page.
    }
  }

  return jobs;
}

async function enrichJob(driver, job) {
  try {
    await driver.get(job.url);
    await driver.wait(until.urlContains('linkedin.com/jobs/'), 10000);
    await driver.sleep(700);

    const description = await firstText(driver, [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '#job-details',
    ]);
    const title = await firstText(driver, [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      'h1',
    ]);
    const company = await firstText(driver, [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
    ]);
    const location = await firstText(driver, [
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
    ]);

    return {
      ...job,
      title: title || job.title,
      company: company || job.company,
      location: location || job.location,
      description,
      enrichedAt: new Date().toISOString(),
    };
  } catch {
    return { ...job, description: '', enrichmentFailed: true };
  }
}

async function clickNextPage(driver) {
  const selectors = [
    'button[aria-label*="Next"]',
    'button[aria-label*="next"]',
    '.artdeco-pagination__button--next',
  ];

  for (const selector of selectors) {
    try {
      const button = await driver.findElement(By.css(selector));
      const disabled = await button.getAttribute('disabled');
      const ariaDisabled = await button.getAttribute('aria-disabled');
      if (disabled !== null || ariaDisabled === 'true') return false;
      await button.click();
      await driver.sleep(1200);
      return true;
    } catch {
      // Try the next selector.
    }
  }
  return false;
}

async function findLoginField(driver, selectors) {
  for (const selector of selectors) {
    try {
      return await driver.findElement(By.css(selector));
    } catch {
      // Try the next known LinkedIn selector.
    }
  }
  return null;
}

async function loginIfNeeded(driver, config) {
  const username = await findLoginField(driver, [
    '#session_key',
    '#username',
    'input[name="session_key"]',
    'input[name="username"]',
    'input[type="email"]',
  ]);
  const password = await findLoginField(driver, [
    '#session_password',
    '#password',
    'input[name="session_password"]',
    'input[name="password"]',
    'input[type="password"]',
  ]);

  if (!username || !password) return false;

  if (!config.linkedinUsername || !config.linkedinPassword) {
    throw new Error('LinkedIn login is required. Set LINKEDIN_USERNAME and LINKEDIN_PASSWORD in .env, or use an existing browser session.');
  }

  await username.clear();
  await username.sendKeys(config.linkedinUsername);
  await password.clear();
  await password.sendKeys(config.linkedinPassword);
  await password.submit();

  await driver.sleep(2500);
  return true;
}

async function ensureJobResults(driver, config) {
  try {
    await driver.wait(until.elementsLocated(By.css(JOB_CARD_SELECTOR)), 20000);
    return;
  } catch {
    const currentUrl = await driver.getCurrentUrl();
    const title = await driver.getTitle();
    throw new Error(
      `LinkedIn job results did not load. Current URL: ${currentUrl}; page title: ${title}. ` +
      'The account may still require verification/CAPTCHA, or LinkedIn may have changed the page layout.',
    );
  }
}

export async function collectLinkedInJobs(config, searchUrls = [config.jobSearchUrl]) {
  const driver = await createBrowser(config);
  const jobs = new Map();

  try {
    for (const searchUrl of searchUrls) {
      await driver.get(searchUrl);
      await loginIfNeeded(driver, config);

      // Re-open the requested search after a successful login.
      await driver.get(searchUrl);
      await driver.wait(until.urlContains('linkedin.com'), config.collectionTimeoutMs);
      await ensureJobResults(driver, config);

      for (let page = 0; page < config.maxJobPages; page += 1) {
        const pageJobs = await collectPage(driver);
        for (const job of pageJobs) jobs.set(job.jobKey, job);
        if (!(await clickNextPage(driver))) break;
      }
    }

    const collected = [...jobs.values()];
    const enriched = [];
    for (const job of collected.slice(0, config.maxJobsToEnrich)) {
      enriched.push(await enrichJob(driver, job));
    }
    return enriched.concat(collected.slice(config.maxJobsToEnrich));
  } finally {
    await closeBrowser(driver);
  }
}
