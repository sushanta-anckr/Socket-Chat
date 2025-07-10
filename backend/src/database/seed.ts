#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import db from '@/database/connection';
import { logger } from '@/utils/logger';

async function runSeed(): Promise<void> {
  try {
    logger.info('Starting database seeding...');
    
    // Connect to database
    await db.connect();
    logger.info('Connected to database');
    
    // Read and execute seed.sql
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    
    if (!fs.existsSync(seedPath)) {
      throw new Error('Seed file not found at: ' + seedPath);
    }
    
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    logger.info('Executing database seed...');
    
    // Split SQL into individual statements and execute them
    const statements = seedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let executedStatements = 0;
    
    for (const statement of statements) {
      try {
        await db.query(statement);
        executedStatements++;
        
        // Log progress for major operations
        if (statement.toLowerCase().includes('truncate')) {
          logger.info('🗑️  Cleared existing data');
        } else if (statement.toLowerCase().includes('insert into users')) {
          logger.info('👤 Inserted sample users');
        } else if (statement.toLowerCase().includes('insert into chats')) {
          logger.info('💬 Inserted sample chats');
        } else if (statement.toLowerCase().includes('insert into chat_members')) {
          logger.info('👥 Inserted chat members');
        } else if (statement.toLowerCase().includes('insert into messages')) {
          logger.info('📝 Inserted sample messages');
        } else if (statement.toLowerCase().includes('insert into friendships')) {
          logger.info('🤝 Inserted friendships');
        } else if (statement.toLowerCase().includes('insert into user_sessions')) {
          logger.info('🔐 Inserted user sessions');
        }
        
      } catch (error) {
        logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
        logger.error('Error:', error);
        throw error;
      }
    }
    
    logger.info(`✅ Seeding completed successfully! Executed ${executedStatements} statements.`);
    
    // Verify data was inserted
    const dataCounts = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM chats'),
      db.query('SELECT COUNT(*) as count FROM chat_members'),
      db.query('SELECT COUNT(*) as count FROM messages'),
      db.query('SELECT COUNT(*) as count FROM friendships'),
      db.query('SELECT COUNT(*) as count FROM user_sessions')
    ]);
    
    const [users, chats, members, messages, friendships, sessions] = dataCounts;
    
    logger.info('📊 Data summary:');
    logger.info(`   👤 Users: ${users[0]?.count || 0}`);
    logger.info(`   💬 Chats: ${chats[0]?.count || 0}`);
    logger.info(`   👥 Chat Members: ${members[0]?.count || 0}`);
    logger.info(`   📝 Messages: ${messages[0]?.count || 0}`);
    logger.info(`   🤝 Friendships: ${friendships[0]?.count || 0}`);
    logger.info(`   🔐 User Sessions: ${sessions[0]?.count || 0}`);
    
    // Show sample data
    logger.info('\n📋 Sample data overview:');
    
    const sampleUsers = await db.query('SELECT username, email, display_name FROM users LIMIT 3');
    logger.info('Sample users:');
    sampleUsers.forEach((user: any) => {
      logger.info(`   - ${user.display_name} (@${user.username}) - ${user.email}`);
    });
    
    const sampleChats = await db.query('SELECT name, chat_type, description FROM chats LIMIT 5');
    logger.info('Sample chats:');
    sampleChats.forEach((chat: any) => {
      logger.info(`   - ${chat.name || '[Private Chat]'} (${chat.chat_type}) - ${chat.description || 'No description'}`);
    });
    
    const sampleMessages = await db.query(`
      SELECT m.content, u.display_name, c.name as chat_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN chats c ON m.chat_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 3
    `);
    logger.info('Recent messages:');
    sampleMessages.forEach((msg: any) => {
      logger.info(`   - ${msg.display_name} in ${msg.chat_name || 'Private Chat'}: "${msg.content}"`);
    });
    
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    try {
      await db.disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  runSeed()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    });
}

export default runSeed; 