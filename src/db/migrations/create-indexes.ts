import mongoose from 'mongoose';
import { logger } from '@helpers/logger.helper';

/**
 * Database Index Migration Script
 * Creates performance-critical indexes for the social app
 */

export const createDatabaseIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    logger.log('Starting database index creation...');

    // 1. Critical Email Index for Login Performance
    // This is the most important index for login optimization
    await db.collection('users').createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        background: true,
        name: 'email_unique_idx'
      }
    );
    logger.log('✅ Created unique email index for users collection');

    // 2. Compound Index for Email + Provider (Multi-provider support)
    await db.collection('users').createIndex(
      { email: 1, provider: 1 }, 
      { 
        background: true,
        name: 'email_provider_idx'
      }
    );
    logger.log('✅ Created email + provider compound index');

    // 3. Confirmation Status Index (Sparse - only for confirmed users)
    await db.collection('users').createIndex(
      { confirmEmail: 1 }, 
      { 
        sparse: true, 
        background: true,
        name: 'confirm_email_idx'
      }
    );
    logger.log('✅ Created confirmEmail sparse index');

    // 4. Role Index for Authorization Queries
    await db.collection('users').createIndex(
      { role: 1 }, 
      { 
        background: true,
        name: 'role_idx'
      }
    );
    logger.log('✅ Created role index');

    // 5. Provider Index for OAuth Queries
    await db.collection('users').createIndex(
      { provider: 1 }, 
      { 
        background: true,
        name: 'provider_idx'
      }
    );
    logger.log('✅ Created provider index');

    // 6. Freeze Status Index for Admin Operations
    await db.collection('users').createIndex(
      { freezeAt: 1 }, 
      { 
        sparse: true, 
        background: true,
        name: 'freeze_status_idx'
      }
    );
    logger.log('✅ Created freeze status index');

    // 7. Timestamps Index for User Analytics
    await db.collection('users').createIndex(
      { createdAt: -1 }, 
      { 
        background: true,
        name: 'created_at_desc_idx'
      }
    );
    logger.log('✅ Created createdAt descending index');

    // Additional indexes for other collections if needed
    
    // Token Model Indexes
    await db.collection('tokens').createIndex(
      { userId: 1 }, 
      { 
        background: true,
        name: 'token_user_idx'
      }
    );
    logger.log('✅ Created userId index for tokens collection');

    // Verification Token Indexes
    await db.collection('verificationtokens').createIndex(
      { email: 1, type: 1 }, 
      { 
        background: true,
        name: 'verification_email_type_idx'
      }
    );
    logger.log('✅ Created email + type index for verification tokens');

    await db.collection('verificationtokens').createIndex(
      { expiresAt: 1 }, 
      { 
        background: true,
        expireAfterSeconds: 0, // TTL index
        name: 'verification_ttl_idx'
      }
    );
    logger.log('✅ Created TTL index for verification tokens');

    logger.log('🎉 All database indexes created successfully!');
    
  } catch (error) {
    logger.error('❌ Error creating database indexes:', error);
    throw error;
  }
};

/**
 * Verify that all indexes exist and are working
 */
export const verifyDatabaseIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    logger.log('Verifying database indexes...');

    // Get all indexes for users collection
    const userIndexes = await db.collection('users').listIndexes().toArray();
    
    const requiredIndexes = [
      'email_unique_idx',
      'email_provider_idx', 
      'confirm_email_idx',
      'role_idx',
      'provider_idx',
      'freeze_status_idx',
      'created_at_desc_idx'
    ];

    const existingIndexNames = userIndexes.map(idx => idx.name);
    
    for (const requiredIndex of requiredIndexes) {
      if (existingIndexNames.includes(requiredIndex)) {
        logger.log(`✅ Index verified: ${requiredIndex}`);
      } else {
        logger.error(`❌ Missing index: ${requiredIndex}`);
      }
    }

    // Test query performance with explain
    const explainResult = await db.collection('users').find({ email: 'test@example.com' }).explain('executionStats');
    
    if (explainResult.executionStats.executionTimeMillis < 10) {
      logger.log('✅ Email query performance is optimal (< 10ms)');
    } else {
      logger.log(`⚠️ Email query took ${explainResult.executionStats.executionTimeMillis}ms - consider index optimization`);
    }

    logger.log('🔍 Index verification completed');
    
  } catch (error) {
    logger.error('❌ Error verifying indexes:', error);
    throw error;
  }
};

/**
 * Drop all custom indexes (for development/testing)
 */
export const dropDatabaseIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    logger.log('Dropping custom database indexes...');

    const collections = ['users', 'tokens', 'verificationtokens'];
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).listIndexes().toArray();
      
      for (const index of indexes) {
        // Don't drop the default _id index
        if (index.name !== '_id_') {
          try {
            await db.collection(collectionName).dropIndex(index.name);
            logger.log(`✅ Dropped index: ${index.name} from ${collectionName}`);
          } catch (error) {
            logger.log(`⚠️ Could not drop index ${index.name}: ${error}`);
          }
        }
      }
    }

    logger.log('🗑️ Index cleanup completed');
    
  } catch (error) {
    logger.error('❌ Error dropping indexes:', error);
    throw error;
  }
};
