import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../app.js";

let testingApp;
let inMemoryServer;

beforeAll(async () => {
  inMemoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: "my-db-test",
    },
  });
  await mongoose.connect(inMemoryServer.getUri());
  testingApp = app.listen(3005);
});

afterAll(async () => {
  await inMemoryServer?.stop();
  testingApp?.close();
});

beforeEach(async () => {
  if (mongoose.connection.collections["users"]) {
    await mongoose.connection.collections["users"].deleteMany({});
  }
});

export { testingApp };
