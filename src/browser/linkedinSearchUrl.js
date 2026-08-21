const WORK_MODE_FILTERS = {
  onsite: '1',
  remote: '2',
  hybrid: '3',
};

const EMPLOYMENT_TYPE_FILTERS = {
  'full-time': 'F',
  'part-time': 'P',
  contract: 'C',
  temporary: 'T',
  volunteer: 'V',
  internship: 'I',
};

function cleanList(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean))];
}

export function buildLinkedInSearchUrl({
  baseUrl = 'https://www.linkedin.com/jobs/search/',
  titles = [],
  location = '',
  workModes = [],
  employmentTypes = [],
} = {}) {
  const url = new URL(baseUrl);
  const titleList = cleanList(titles);
  const modeFilters = cleanList(workModes)
    .map((mode) => WORK_MODE_FILTERS[mode.toLowerCase()])
    .filter(Boolean);
  const employmentFilters = cleanList(employmentTypes)
    .map((type) => EMPLOYMENT_TYPE_FILTERS[type.toLowerCase()])
    .filter(Boolean);

  if (titleList.length) {
    url.searchParams.set(
      'keywords',
      titleList.length === 1
        ? titleList[0]
        : titleList.map((title) => `"${title}"`).join(' OR '),
    );
  }
  if (location) url.searchParams.set('location', String(location).trim());
  if (modeFilters.length) url.searchParams.set('f_WT', modeFilters.join(','));
  if (employmentFilters.length) url.searchParams.set('f_JT', employmentFilters.join(','));

  return url.toString();
}

export function buildLinkedInSearchUrls({
  baseUrl = 'https://www.linkedin.com/jobs/search/',
  locations = [],
  titles = [],
  workModes = [],
  employmentTypes = [],
} = {}) {
  const locationList = cleanList(locations);
  const targets = locationList.length ? locationList : [''];
  return targets.map((location) => buildLinkedInSearchUrl({
    baseUrl,
    titles,
    location,
    workModes,
    employmentTypes,
  }));
}
