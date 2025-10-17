#!/usr/bin/env node

/**
 * Manual Database Index Creation Script
 * Run this script to create performance indexes manually
 * 
 * Usage:
 * node scripts/create-indexes.js
 * 
 * Or with npm:
 * npm run create-indexes
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const dbName = process.env.DB_NAME;
const url = process.env.DB_URL;
const connectionString = `${url}/${dbName}`;

async function createIndexes() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(connectionString);
    await client.connect();
    
    const db = client.db(dbName);
    console.log(`✅ Connected to database: ${dbName}`);

    console.log('📊 Creating performance indexes...');

    // 1. Critical Email Index for Login Performance
    await db.collection('users').createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        background: true,
        name: 'email_unique_idx'
      }
    );
    console.log('✅ Created unique email index');

    // 2. Compound Index for Email + Provider
    await db.collection('users').createIndex(
      { email: 1, provider: 1 }, 
      { 
        background: true,
        name: 'email_provider_idx'
      }
    );
    console.log('✅ Created email + provider compound index');

    // 3. Confirmation Status Index
    await db.collection('users').createIndex(
      { confirmEmail: 1 }, 
      { 
        sparse: true, 
        background: true,
        name: 'confirm_email_idx'
      }
    );
    console.log('✅ Created confirmEmail sparse index');

    // 4. Role Index
    await db.collection('users').createIndex(
      { role: 1 }, 
      { 
        background: true,
        name: 'role_idx'
      }
    );
    console.log('✅ Created role index');

    // 5. Provider Index
    await db.collection('users').createIndex(
      { provider: 1 }, 
      { 
        background: true,
        name: 'provider_idx'
      }
    );
    console.log('✅ Created provider index');

    // 6. Freeze Status Index
    await db.collection('users').createIndex(
      { freezeAt: 1 }, 
      { 
        sparse: true, 
        background: true,
        name: 'freeze_status_idx'
      }
    );
    console.log('✅ Created freeze status index');

    // 7. Timestamps Index
    await db.collection('users').createIndex(
      { createdAt: -1 }, 
      { 
        background: true,
        name: 'created_at_desc_idx'
      }
    );
    console.log('✅ Created createdAt descending index');

    // Additional collection indexes
    await db.collection('tokens').createIndex(
      { userId: 1 }, 
      { 
        background: true,
        name: 'token_user_idx'
      }
    );
    console.log('✅ Created userId index for tokens');

    await db.collection('verificationtokens').createIndex(
      { email: 1, type: 1 }, 
      { 
        background: true,
        name: 'verification_email_type_idx'
      }
    );
    console.log('✅ Created email + type index for verification tokens');

    await db.collection('verificationtokens').createIndex(
      { expiresAt: 1 }, 
      { 
        background: true,
        expireAfterSeconds: 0,
        name: 'verification_ttl_idx'
      }
    );
    console.log('✅ Created TTL index for verification tokens');

    console.log('\n🎉 All indexes created successfully!');
    
    // Verify indexes
    console.log('\n🔍 Verifying indexes...');
    const userIndexes = await db.collection('users').listIndexes().toArray();
    console.log('📋 User collection indexes:');
    userIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Test query performance
    console.log('\n⚡ Testing query performance...');
    const startTime = Date.now();
    await db.collection('users').findOne({ email: 'test@example.com' });
    const queryTime = Date.now() - startTime;
    console.log(`📈 Email query completed in ${queryTime}ms`);

    if (queryTime < 10) {
      console.log('✅ Query performance is optimal!');
    } else {
      console.log('⚠️  Query performance could be improved');
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
createIndexes()
  .then(() => {
    console.log('\n✨ Index creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
