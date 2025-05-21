import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.local' });

let mongoServer;

// Connect to the in-memory database before running tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Error in beforeAll:', error);
    throw error;
  }
});

// Clear all test data after each test
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  } catch (error) {
    console.error('Error in afterEach:', error);
    throw error;
  }
});

// Disconnect and stop server after all tests
afterAll(async () => {
  try {
    await mongoose.connection.close();
    await mongoServer.stop();
  } catch (error) {
    console.error('Error in afterAll:', error);
    throw error;
  }
}); 