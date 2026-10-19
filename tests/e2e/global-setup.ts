import { openAllDay, resetDatabase } from './db';

export default async function globalSetup() {
  resetDatabase();
  await openAllDay();
}
