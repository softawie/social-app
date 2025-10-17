import mongoose from "mongoose";
import dotenv from "dotenv";
import { createDatabaseIndexes, verifyDatabaseIndexes } from "./migrations/create-indexes";
import { logger } from "@helpers/logger.helper";

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
    
    // Create performance indexes after successful connection
    await initializeDatabaseIndexes();
    
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

/**
 * Initialize database indexes for optimal performance
 */
const initializeDatabaseIndexes = async (): Promise<void> => {
  try {
    // Skip index creation in test environment to speed up tests
    if (process.env.NODE_ENV === 'test') {
      logger.log('Skipping index creation in test environment');
      return;
    }

    logger.log('Initializing database indexes for performance optimization...');
    
    // Create all required indexes
    await createDatabaseIndexes();
    
    // Verify indexes were created successfully
    if (process.env.NODE_ENV === 'development') {
      await verifyDatabaseIndexes();
    }
    
    logger.log('✅ Database performance optimization completed');
    
  } catch (error) {
    logger.error('❌ Failed to initialize database indexes:', error);
    // Don't throw error to prevent app startup failure
    // Indexes can be created manually if needed
  }
};
