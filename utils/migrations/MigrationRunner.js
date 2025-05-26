// utils/migrations/MigrationRunner.js
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

class MigrationRunner {
  constructor() {
    this.migrations = new Map();
  }

  register(name, migration) {
    this.migrations.set(name, migration);
  }

  async getMigrationStatus(name) {
    const migrationDoc = await getDoc(doc(db, '_migrations', name));
    return migrationDoc.exists() ? migrationDoc.data() : null;
  }

  async run(name) {
    const migration = this.migrations.get(name);
    if (!migration) {
      throw new Error(`Migration ${name} not found`);
    }

    // Check if already run
    const status = await this.getMigrationStatus(name);
    if (status?.completed) {
      console.log(`Migration ${name} already completed`);
      return status;
    }

    console.log(`Starting migration: ${name}`);
    const startTime = Date.now();

    try {
      const result = await migration.up();
      
      // Record success
      await setDoc(doc(db, '_migrations', name), {
        name,
        completed: true,
        startedAt: new Date(startTime).toISOString(),
        completedAt: serverTimestamp(),
        duration: Date.now() - startTime,
        result,
        error: null
      });

      console.log(`Migration ${name} completed successfully`);
      return result;
    } catch (error) {
      // Record failure
      await setDoc(doc(db, '_migrations', name), {
        name,
        completed: false,
        startedAt: new Date(startTime).toISOString(),
        failedAt: serverTimestamp(),
        duration: Date.now() - startTime,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  async rollback(name) {
    const migration = this.migrations.get(name);
    if (!migration?.down) {
      throw new Error(`No rollback available for ${name}`);
    }

    console.log(`Rolling back migration: ${name}`);
    await migration.down();
    
    // Remove migration record
    await deleteDoc(doc(db, '_migrations', name));
  }
}

export const migrationRunner = new MigrationRunner();
