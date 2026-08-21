import fs from 'node:fs/promises';
import { By } from 'selenium-webdriver';
import { createBrowser, closeBrowser } from '../browser/driver.js';
import { ApplicationStore } from '../core/applicationStore.js';

// LinkedIn changes its Easy Apply markup frequently. Keep several selectors
// and fall back to visible button text instead of relying on one class name.
const EASY_APPLY_SELECTORS = [
  { type: 'css', value: 'button.jobs-apply-button' },
  { type: 'css', value: 'button[aria-label*="Easy Apply" i]' },
  { type: 'css', value: 'button[aria-label*="Easy apply" i]' },
  { type: 'css', value: 'button[data-control-name*="easy_apply" i]' },
  { type: 'css', value: 'button[data-control-name*="easyApply" i]' },
  {
    type: 'xpath',
    value: '//button[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "easy apply")]'
  },
];

async function findElements(driver, selector) {
  const by = selector.type === 'xpath' ? By.xpath(selector.value) : By.css(selector.value);
  return driver.findElements(by);
}

async function firstVisible(driver, selectors, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const selector of selectors) {
      for (const element of await findElements(driver, selector)) {
        if (await element.isDisplayed().catch(() => false)) return element;
      }
    }
    await driver.sleep(300);
  }
  return null;
}

async function fillInput(driver, selectors, value) {
  if (!value) return 0;
  const input = await firstVisible(driver, selectors.map((value) => ({ type: 'css', value })), 2000);
  if (!input) return 0;
  const current = await input.getAttribute('value').catch(() => '');
  if (current) return 0;
  await input.sendKeys(value);
  return 1;
}

async function fillKnownFields(driver, profile) {
  const fullName = String(profile.name ?? '').trim();
  const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
  const lastName = rest.join(' ');
  const fields = [
    {
      selectors: ['input[id*="firstName" i]', 'input[name*="firstName" i]', 'input[autocomplete="given-name"]'],
      value: firstName,
    },
    {
      selectors: ['input[id*="lastName" i]', 'input[name*="lastName" i]', 'input[autocomplete="family-name"]'],
      value: lastName,
    },
    {
      selectors: ['input[id*="phone" i]', 'input[name*="phone" i]', 'input[type="tel"]'],
      value: profile.phone,
    },
    {
      selectors: ['input[id*="email" i]', 'input[name*="email" i]', 'input[type="email"]'],
      value: profile.email,
    },
    {
      selectors: ['input[id*="location" i]', 'input[name*="location" i]'],
      value: profile.location,
    },
  ];

  let filledFields = 0;
  for (const field of fields) {
    filledFields += await fillInput(driver, field.selectors, field.value);
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

    const easyApply = await firstVisible(driver, EASY_APPLY_SELECTORS, 10000);
    if (!easyApply) {
      const screenshotPath = `${config.dataDir}/application-${application.id}-easy-apply-not-found.png`;
      await fs.mkdir(config.dataDir, { recursive: true });
      await fs.writeFile(screenshotPath, await driver.takeScreenshot(), 'base64');
      return await store.updateStatus(application.id, 'needs_review', {
        executionMode: 'dry-run',
        executionError: 'Easy Apply button was not found.',
        screenshotPath,
      });
    }

    await easyApply.click();
    await driver.sleep(1000);
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
