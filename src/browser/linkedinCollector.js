import { By, until } from 'selenium-webdriver';
import { createBrowser, closeBrowser } from './driver.js';

const JOB_CARD_SELECTOR = '.jobs-search-results__list-item, .job-card-container';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function jobKey(job) {
  return job.url || `${job.title}|${job.company}|${job.location}`.toLowerCase();
}

async function textFromElement(element) {
  try {
    const text = clean(await element.getText());
    if (text) return text;
  } catch {
    // Fall through to attributes.
  }
  for (const attribute of ['aria-label', 'title']) {
    try {
      const value = clean(await element.getAttribute(attribute));
      if (value) return value;
    } catch {
      // Try the next attribute.
    }
  }
  return '';
}

async function textFromCard(card, selectors) {
  for (const selector of selectors) {
    try {
      const element = await card.findElement(By.css(selector));
      const value = await textFromElement(element);
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
      const value = await textFromElement(element);
      if (value) return value;
    } catch {
      // Try the next selector.
    }
  }
  return '';
}

async function collectPage(driver) {
  await driver.wait(until.elementsLocated(By.css(JOB_CARD_SELECTOR)), 15000);
  const cards = await driver.findElements(By.css(JOB_CARD_SELECTOR));
  const jobs = [];

  for (const card of cards) {
    try {
      const link = await card.findElement(By.css('a[href*="/jobs/view/"]'));
      const url = (await link.getAttribute('href'))?.split('?')[0] || '';
      const title = await textFromCard(card, [
        '.job-card-list__title',
        '.job-card-container__link',
        'a[href*="/jobs/view/"]',
      ]);
      const company = await textFromCard(card, [
        'a[href*="/company/"]',
        '.artdeco-entity-lockup__subtitle a',
        '.artdeco-entity-lockup__subtitle',
        '.job-card-container__company-name',
      ]);
      const location = await textFromCard(card, [
        '.job-card-container__metadata-item',
        '.artdeco-entity-lockup__caption',
        '[data-view-name*="job-card"] .artdeco-entity-lockup__caption',
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
    await driver.sleep(900);

    const description = await firstText(driver, [
      '.jobs-description-content__text',
      '.jobs-description__content',
      '.jobs-box__html-content',
      '#job-details',
      'main .jobs-description',
    ]);
    const title = await firstText(driver, [
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      'h1',
    ]);
    const company = await firstText(driver, [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
    ]);
    const location = await firstText(driver, [
      '.job-details-jobs-unified-top-card__primary-description-container',
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
      enrichmentFailed: !description,
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

export async function collectLinkedInJobs(config) {
  const driver = await createBrowser(config);
  const jobs = new Map();

  try {
    await driver.get(config.jobSearchUrl);

    if (config.linkedinUsername && config.linkedinPassword) {
      try {
        const username = await driver.wait(until.elementLocated(By.id('username')), config.collectionTimeoutMs);
        const password = await driver.findElement(By.id('password'));
        await username.sendKeys(config.linkedinUsername);
        await password.sendKeys(config.linkedinPassword);
        await password.submit();
        await driver.sleep(1500);
      } catch {
        // An existing session or changed login page is okay.
      }
    }

    await driver.get(config.jobSearchUrl);
    await driver.wait(until.urlContains('linkedin.com'), config.collectionTimeoutMs);

    for (let page = 0; page < config.maxJobPages; page += 1) {
      const pageJobs = await collectPage(driver);
      for (const job of pageJobs) jobs.set(job.jobKey, job);
      if (!(await clickNextPage(driver))) break;
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
