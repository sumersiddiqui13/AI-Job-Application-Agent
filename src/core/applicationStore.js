import fs from 'node:fs/promises';
import path from 'node:path';

export class ApplicationStore {
  constructor(filePath = './data/applications.json') {
    this.filePath = filePath;
  }

  async #read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #write(records) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, `${JSON.stringify(records, null, 2)}\n`);
  }

  async hasApplied(jobKey) {
    const records = await this.#read();
    return records.some((record) => record.jobKey === jobKey && ['approved', 'submitted', 'interview', 'offer'].includes(record.status));
  }

  async add(record) {
    const records = await this.#read();
    const existing = records.find((item) => item.jobKey === record.jobKey);
    if (existing) return existing;

    const next = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'prepared',
      ...record,
    };
    records.push(next);
    await this.#write(records);
    return next;
  }

  async updateStatus(id, status, extra = {}) {
    const records = await this.#read();
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`Application not found: ${id}`);
    records[index] = { ...records[index], ...extra, status, updatedAt: new Date().toISOString() };
    await this.#write(records);
    return records[index];
  }

  async list() {
    return this.#read();
  }
}
