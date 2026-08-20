import fs from 'node:fs/promises';
import path from 'node:path';
import { By } from 'selenium-webdriver';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

export async function validateResumePath(resumePath) {
  if (!resumePath) throw new Error('Resume path is required.');
  const absolute = path.resolve(resumePath);
  const stat = await fs.stat(absolute);
  if (!stat.isFile()) throw new Error('Resume path is not a file.');
  if (!ALLOWED_EXTENSIONS.has(path.extname(absolute).toLowerCase())) {
    throw new Error('Unsupported resume format. Use PDF, DOC, or DOCX.');
  }
  return absolute;
}

export async function uploadResume(driver, resumePath) {
  const absolute = await validateResumePath(resumePath);
  const inputs = await driver.findElements(By.css('input[type="file"]'));
  const visibleOrFile = inputs.find((input) => input.isDisplayed().catch(() => false)) || inputs[0];
  if (!visibleOrFile) return { status: 'needs_review', reason: 'No file input found.' };
  await visibleOrFile.sendKeys(absolute);
  return { status: 'uploaded', path: absolute };
}
