import fs from 'node:fs/promises';
import { By } from 'selenium-webdriver';
import { createBrowser, closeBrowser } from '../browser/driver.js';
import { ApplicationStore } from '../core/applicationStore.js';

const EASY_APPLY_SELECTORS = [
  'button.jobs-apply-button',
  'button[aria-label*="Easy Apply"]',
  'button[aria-label*="Easy apply"]',
];

async function firstVisible(driver, selectors, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const selector of selectors) {
      for (const element of await driver.findElements(By.css(selector))) {
        if (await element.isDisplayed().catch(() => false)) return element;
      }
    }
    await driver.sleep(250);
  }
  return null;
}

async function fillKnownFields(driver, profile) {
  const values = [
    { selectors: ['input[id*="phone"]', 'input[name*="phone"]', 'input[type="tel"]'], value: profile.phone },
    { selectors: ['input[id*="email"]', 'input[name*="email"]', 'input[type="email"]'], value: profile.email },
  ];
  let filledFields = 0;
  for (const field of values) {
    if (!field.value) continue;
    const input = await firstVisible(driver, field.selectors, 1500);
    if (!input) continue;
    const current = await input.getAttribute('value').catch(() => '');
    if (!current) {
      await input.sendKeys(field.value);
      filledFields += 1;
    }
  }
  return filledFields;
}

export async function prepareApprovedApplication({ config, applicationId }) {
  const store = new ApplicationStore(config.applicationsPath);
  const application = (await store.list()).find((item) => item.id === applicationId);
  if (!application) throw new Error(`Application not found: ${applicationId}`);
  if (application.status !== 'approved') throw new Error('Application must be approved before browser preparation.');
  if (!application.job?.url) throw new Error('Application has no job URL.');

  const profile = JSON.parse(await fs.readFile(config.profilePath, 'utf8'));
  const driver = await createBrowser(config);
  try {
    await store.updateStatus(application.id, 'in_progress', { executionMode: 'dry-run' });
    await driver.get(application.job.url);

    const easyApply = await firstVisible(driver, EASY_APPLY_SELECTORS, 5000);
    if (!easyApply) {
      return await store.updateStatus(application.id, 'needs_review', {
        executionMode: 'dry-run',
        executionError: 'Easy Apply button was not found.',
      });
    }

    await easyApply.click();
    await driver.sleep(750);
    const filledFields = await fillKnownFields(driver, profile);
    const screenshotPath = `${config.dataDir}/application-${application.id}.png`;
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(screenshotPath, await driver.takeScreenshot(), 'base64');

    return await store.updateStatus(application.id, 'ready_to_submit', {
      executionMode: 'dry-run',
      filledFields,
      screenshotPath,
      submitBlocked: true,
      note: 'Dry-run stopped before final submission. No Submit button is clicked.',
    });
  } catch (error) {
    await store.updateStatus(application.id, 'needs_review', {
      executionMode: 'dry-run',
      executionError: error.message,
    });
    throw error;
  } finally {
    await closeBrowser(driver);
  }
}
