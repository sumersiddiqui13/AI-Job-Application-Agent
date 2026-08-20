import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLinkedInSearchUrl, buildLinkedInSearchUrls } from '../src/browser/linkedinSearchUrl.js';

test('builds a LinkedIn search URL from titles, location, work modes and employment type', () => {
  const url = new URL(buildLinkedInSearchUrl({
    titles: ['Data Engineer', 'AWS Data Engineer'],
    location: 'Hyderabad, India',
    workModes: ['remote', 'hybrid', 'onsite'],
    employmentTypes: ['full-time'],
  }));

  assert.equal(url.searchParams.get('location'), 'Hyderabad, India');
  assert.equal(url.searchParams.get('f_WT'), '2,3,1');
  assert.equal(url.searchParams.get('f_JT'), 'F');
  assert.match(url.searchParams.get('keywords'), /Data Engineer/);
  assert.match(url.searchParams.get('keywords'), /AWS Data Engineer/);
});

test('builds one search URL per configured location', () => {
  const urls = buildLinkedInSearchUrls({
    locations: ['Hyderabad, India', 'Pune, India'],
    titles: ['Data Engineer'],
  });

  assert.equal(urls.length, 2);
  assert.equal(new URL(urls[0]).searchParams.get('location'), 'Hyderabad, India');
  assert.equal(new URL(urls[1]).searchParams.get('location'), 'Pune, India');
});
