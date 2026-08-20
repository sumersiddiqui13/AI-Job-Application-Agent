import fs from 'node:fs/promises';
import { ApplicationStore } from '../core/applicationStore.js';
import { createBrowser, closeBrowser } from '../browser/driver.js';
import { inspectApplicationForm } from './formIntelligence.js';

export async function inspectApprovedApplication({ config, applicationId }) {
  const store = new ApplicationStore(config.applicationsPath);
  const applications = await store.list();
  const application = applications.find((item) => item.id === applicationId);
  if (!application) throw new Error(`Application not found: ${applicationId}`);
  if (application.status !== 'approved') throw new Error('Application must be approved first.');

  const driver = await createBrowser(config);
  try {
    await store.updateStatus(application.id, 'in_progress', { executionMode: 'form-inspection' });
    await driver.get(application.job.url);
    const fields = await inspectApplicationForm(driver);
    const screenshotPath = `${config.dataDir}/form-${application.id}.png`;
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(screenshotPath, await driver.takeScreenshot(), 'base64');
    return await store.updateStatus(application.id, 'needs_review', {
      executionMode: 'form-inspection',
      formFields: fields,
      screenshotPath,
      submitBlocked: true,
    });
  } catch (error) {
    await store.updateStatus(application.id, 'needs_review', { executionError: error.message });
    throw error;
  } finally {
    await closeBrowser(driver);
  }
}
