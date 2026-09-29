import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Bypasses env.MONGODB_URI/connectToDatabase entirely — Mongoose's connection is a process-wide
// singleton shared by every imported model regardless of who called .connect(), so tests just
// point that singleton at an ephemeral in-memory instance instead.
let mongod: MongoMemoryServer | undefined;

export async function setupTestDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function teardownTestDb(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = undefined;
}

export async function clearTestDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}
