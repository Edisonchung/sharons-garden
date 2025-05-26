// migrations/001_create_indexes.js
import { migrationRunner } from '../utils/migrations/MigrationRunner';

const createIndexesMigration = {
  name: '001_create_indexes',
  
  up: async () => {
    console.log('Creating database indexes...');
    
    // Note: In production, indexes should be created via Firebase Console
    // or using Admin SDK. This is a tracking migration.
    
    const indexes = [
      {
        collection: 'flowers',
        fields: [
          { field: 'userId', order: 'ASCENDING' },
          { field: 'bloomed', order: 'ASCENDING' }
        ]
      },
      {
        collection: 'flowers',
        fields: [
          { field: 'songSeed', order: 'ASCENDING' },
          { field: 'createdAt', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'waterings',
        fields: [
          { field: 'timestamp', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'waterings',
        fields: [
          { field: 'seedId', order: 'ASCENDING' },
          { field: 'timestamp', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'users',
        fields: [
          { field: 'username', order: 'ASCENDING' }
        ]
      },
      {
        collection: 'users',
        fields: [
          { field: 'role', order: 'ASCENDING' },
          { field: 'joinedAt', order: 'DESCENDING' }
        ]
      }
    ];

    // Record indexes that need to be created
    await setDoc(doc(db, '_system', 'required_indexes'), {
      indexes,
      createdAt: serverTimestamp(),
      status: 'pending_creation'
    });

    return {
      indexCount: indexes.length,
      indexes: indexes.map(idx => 
        `${idx.collection}: ${idx.fields.map(f => f.field).join(', ')}`
      )
    };
  },

  down: async () => {
    // Indexes typically aren't removed
    console.log('Index removal not implemented');
  }
};

// Register migration
migrationRunner.register('001_create_indexes', createIndexesMigration);
