import { By } from 'selenium-webdriver';
import fs from 'node:fs/promises';
import { ApplicationStore } from '../core/applicationStore.js';
import { createBrowser, closeBrowser } from '../browser/driver.js';
import { canSubmit } from './submissionGate.js';

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button[aria-label*="Submit"]',
  'button[aria-label*="submit"]',
  'button[data-easy-apply-submit-button]',
];

async function findSubmitButton(driver) {
  for (const selector of SUBMIT_SELECTORS) {
    const elements = await driver.findElements(By.css(selector));
    for (const element of elements) {
      if (await element.isDisplayed().catch(() => false) && await element.isEnabled().catch(() => false)) return element;
    }
  }
  return null;
}

export async function submitApprovedApplication({ config, applicationId, confirmationToken }) {
  const store = new ApplicationStore(config.applicationsPath);
  const applications = await store.list();
  const application = applications.find((item) => item.id === applicationId);
  const gate = canSubmit(application, confirmationToken);
  if (!gate.ok) throw new Error(gate.reason);

  const driver = await createBrowser(config);
  try {
    await driver.get(application.job.url);
    const submit = await findSubmitButton(driver);
    if (!submit) throw new Error('Final Submit button was not found. No submission was attempted.');

    const screenshot = await driver.takeScreenshot();
    await fs.mkdir(config.dataDir, { recursive: true });
    const screenshotPath = `${config.dataDir}/pre-submit-${applicationId}.png`;
    await fs.writeFile(screenshotPath, screenshot, 'base64');

    await submit.click();
    await store.updateStatus(applicationId, 'submitted', {
      submittedAt: new Date().toISOString(),
      submitConfirmationTokenUsed: confirmationToken,
      submitScreenshotPath: screenshotPath,
    });

    return { status: 'submitted', screenshotPath };
  } catch (error) {
    await store.updateStatus(applicationId, 'submission_failed', {
      submissionError: error.message,
      submissionFailedAt: new Date().toISOString(),
    });
    throw error;
  } finally {
    await closeBrowser(driver);
  }
}
