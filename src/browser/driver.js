import chrome from 'selenium-webdriver/chrome.js';
import { Builder } from 'selenium-webdriver';

export async function createBrowser(config) {
  const options = new chrome.Options();

  if (config.browserHeadless) options.addArguments('--headless=new');
  options.addArguments('--disable-notifications', '--disable-popup-blocking', '--start-maximized');
  if (config.browserUserDataDir) {
    options.addArguments(`--user-data-dir=${config.browserUserDataDir}`);
  }

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}

export async function closeBrowser(driver) {
  if (!driver) return;
  try {
    await driver.quit();
  } catch {
    // Browser cleanup should never hide the original error.
  }
}
