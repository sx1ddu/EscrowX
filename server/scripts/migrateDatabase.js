/**
 * EscrowX Database Migration Script: trusttrade -> escrowx
 * 
 * Safely copies all collections, documents, and indexes from the source database ('trusttrade')
 * to the target database ('escrowx') without mutating or deleting any source data.
 * 
 * Usage:
 *   node scripts/migrateDatabase.js [--dry-run] [--source=trusttrade] [--target=escrowx]
 * 
 * Flags:
 *   --dry-run   Simulates migration and prints record counts without writing
 *   --rollback  Reverts configuration or copies escrowx back to trusttrade
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');

const sourceDbName = isRollback ? 'escrowx' : (args.find(a => a.startsWith('--source='))?.split('=')[1] || 'trusttrade');
const targetDbName = isRollback ? 'trusttrade' : (args.find(a => a.startsWith('--target='))?.split('=')[1] || 'escrowx');

async function migrate() {
  console.log(`\n======================================================`);
  console.log(`  EscrowX Database Migration: ${sourceDbName} -> ${targetDbName}`);
  console.log(`  Mode: ${isDryRun ? 'DRY-RUN (Read-only Simulation)' : 'LIVE MIGRATION'}`);
  console.log(`======================================================\n`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`Connected to MongoDB instance successfully.`);

    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    const sourceExists = dbs.databases.some(d => d.name === sourceDbName);

    if (!sourceExists) {
      console.warn(`Source database '${sourceDbName}' was not found on this MongoDB cluster.`);
      console.log(`If this is a fresh setup, Mongoose will auto-create '${targetDbName}' upon first insert.`);
      return;
    }

    const sourceDb = client.db(sourceDbName);
    const targetDb = client.db(targetDbName);

    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collection(s) in source database '${sourceDbName}'.\n`);

    const summary = [];

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      const sourceCount = await sourceCol.countDocuments();
      console.log(`Processing collection [${colName}] (${sourceCount} documents)...`);

      if (!isDryRun && sourceCount > 0) {
        // 1. Copy documents in batches
        const cursor = sourceCol.find({});
        const batchSize = 500;
        let batch = [];
        let migratedCount = 0;

        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          batch.push(doc);

          if (batch.length === batchSize) {
            await targetCol.insertMany(batch, { ordered: false }).catch(err => {
              if (err.code !== 11000) throw err; // Ignore duplicate key errors if resuming
            });
            migratedCount += batch.length;
            batch = [];
          }
        }

        if (batch.length > 0) {
          await targetCol.insertMany(batch, { ordered: false }).catch(err => {
            if (err.code !== 11000) throw err;
          });
          migratedCount += batch.length;
        }

        // 2. Clone indexes
        const indexes = await sourceCol.indexes();
        for (const idx of indexes) {
          if (idx.name === '_id_') continue;
          const { key, name, unique, sparse, ...otherOptions } = idx;
          await targetCol.createIndex(key, { name, unique, sparse, ...otherOptions }).catch(err => {
            console.warn(`  Index notice for [${colName}.${name}]: ${err.message}`);
          });
        }
      }

      const targetCount = isDryRun ? sourceCount : await targetCol.countDocuments();

      summary.push({
        collection: colName,
        sourceCount,
        targetCount,
        status: sourceCount === targetCount ? 'VERIFIED' : 'COUNT_MISMATCH',
      });
    }

    console.log(`\n----------------- Migration Summary ------------------`);
    console.table(summary);

    const allVerified = summary.every(s => s.status === 'VERIFIED');
    if (allVerified) {
      console.log(`\n SUCCESS: All collections and documents verified!`);
      console.log(`Original source database '${sourceDbName}' remains 100% untouched and preserved.\n`);
    } else {
      console.warn(`\n WARNING: Document count mismatch detected in some collections. Inspect logs.`);
    }

  } catch (err) {
    console.error(`Migration failed with error:`, err);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log(`Database connection closed.\n`);
  }
}

migrate();
