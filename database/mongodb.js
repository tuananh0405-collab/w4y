import mongoose from "mongoose";
import { DB_URI, NODE_ENV } from "../config/env.js";

const connectToDatabase = async () => {
  try {
    // Skip connection in test environment as it's handled by mongodb-memory-server
    if (NODE_ENV === "test") {
      return;
    }

    if (!DB_URI) {
      throw new Error("DB_URI is not defined");
    }

    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    process.exit(1);
  }
};

export default connectToDatabase;
