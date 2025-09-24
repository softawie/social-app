import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const dbName = process.env.DB_NAME;
const url = process.env.DB_URL as string;
const BaseDBUrl = `${url}/${dbName}`;

const options = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

export const CheckDB = async () => {
  try {
    await mongoose.connect(BaseDBUrl, options);
    console.log("Connected to MongoDB successfully as", dbName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};
