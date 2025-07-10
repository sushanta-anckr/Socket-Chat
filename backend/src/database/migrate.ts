#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import db from '@/database/connection';
import { logger } from '@/utils/logger';

async function runMigration(): Promise<void> {
  try {
    logger.info('Starting database migration...');
    
    // Connect to database
    await db.connect();
    logger.info('Connected to database');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found at: ' + schemaPath);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    logger.info('Executing schema migration...');
    
    // Split SQL into individual statements and execute them
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let executedStatements = 0;
    
    for (const statement of statements) {
      try {
        await db.query(statement);
        executedStatements++;
        
        // Log progress for major operations
        if (statement.toLowerCase().includes('create table')) {
          const match = statement.match(/create table\s+(\w+)/i);
          if (match) {
            logger.info(`✅ Created table: ${match[1]}`);
          }
        } else if (statement.toLowerCase().includes('create index')) {
          const match = statement.match(/create index\s+(\w+)/i);
          if (match) {
            logger.info(`📊 Created index: ${match[1]}`);
          }
        } else if (statement.toLowerCase().includes('create function')) {
          const match = statement.match(/create.*function\s+(\w+)/i);
          if (match) {
            logger.info(`⚙️  Created function: ${match[1]}`);
          }
        } else if (statement.toLowerCase().includes('create trigger')) {
          const match = statement.match(/create trigger\s+(\w+)/i);
          if (match) {
            logger.info(`🔔 Created trigger: ${match[1]}`);
          }
        }
        
      } catch (error) {
        logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
        logger.error('Error:', error);
        throw error;
      }
    }
    
    logger.info(`✅ Migration completed successfully! Executed ${executedStatements} statements.`);
    
    // Verify tables were created
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    logger.info(`📋 Created tables: ${tables.map((t: any) => t.table_name).join(', ')}`);
    
  } catch (error) {
    logger.error('Migration failed:', error);
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

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigration; 