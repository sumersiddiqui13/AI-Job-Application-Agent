import { By } from 'selenium-webdriver';

const SELECTORS = {
  text: ['input:not([type="hidden"]):not([type="file"])', 'textarea'],
  select: ['select'],
  radio: ['input[type="radio"]'],
  checkbox: ['input[type="checkbox"]'],
  file: ['input[type="file"]'],
};

function normalize(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

async function visibleElements(driver, selector) {
  const elements = await driver.findElements(By.css(selector));
  const result = [];
  for (const element of elements) {
    if (await element.isDisplayed().catch(() => false)) result.push(element);
  }
  return result;
}

async function labelFor(driver, element) {
  const aria = await element.getAttribute('aria-label').catch(() => null);
  if (aria) return normalize(aria);
  const name = await element.getAttribute('name').catch(() => null);
  if (name) return normalize(name);
  const id = await element.getAttribute('id').catch(() => null);
  if (id) {
    const labels = await driver.findElements(By.css(`label[for="${id}"]`));
    if (labels[0]) return normalize(await labels[0].getText().catch(() => ''));
  }
  return '';
}

export async function inspectApplicationForm(driver) {
  const fields = [];
  for (const [type, selectors] of Object.entries(SELECTORS)) {
    for (const selector of selectors) {
      for (const element of await visibleElements(driver, selector)) {
        const label = await labelFor(driver, element);
        const required = await element.getAttribute('required').catch(() => null);
        fields.push({
          type,
          label,
          required: required !== null,
          name: await element.getAttribute('name').catch(() => null),
          id: await element.getAttribute('id').catch(() => null),
        });
      }
    }
  }
  return fields;
}

/**
 * Apply only deterministic answers supplied by the caller.
 * Unknown fields are returned for review instead of guessed.
 */
export async function fillDeterministicFields(driver, answers = {}) {
  const fields = await inspectApplicationForm(driver);
  const unresolved = [];
  let filled = 0;

  for (const field of fields) {
    const key = field.name || field.id || field.label;
    const answer = answers[key];
    if (answer === undefined || answer === null || answer === '') {
      if (field.required) unresolved.push(field);
      continue;
    }

    const selector = field.id
      ? `#${CSS.escape(field.id)}`
      : field.name
        ? `[name="${CSS.escape(field.name)}"]`
        : null;
    if (!selector) {
      unresolved.push(field);
      continue;
    }

    const elements = await visibleElements(driver, selector);
    if (!elements[0]) {
      unresolved.push(field);
      continue;
    }

    const element = elements[0];
    if (field.type === 'text') {
      await element.clear();
      await element.sendKeys(String(answer));
      filled += 1;
    } else if (field.type === 'radio' || field.type === 'checkbox') {
      if (String(answer).toLowerCase() === 'true' || String(answer).toLowerCase() === 'yes') {
        if (!(await element.isSelected())) await element.click();
        filled += 1;
      }
    } else if (field.type === 'select') {
      unresolved.push({ ...field, reason: 'select-requires-explicit-option-mapping' });
    }
  }

  return { fields, filled, unresolved };
}
