import { connectToDatabase, disconnectFromDatabase } from '../src/db/connection.js';
import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
});
