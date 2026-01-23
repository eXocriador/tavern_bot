db = db.getSiblingDB('tavern_bot');

db.createUser({
  user: 'tavern_user',
  pwd: 'tavern_secure_password_change_me',
  roles: [
    {
      role: 'readWrite',
      db: 'tavern_bot',
    },
  ],
});

// Create indexes for better performance
db.users.createIndex({ telegramId: 1 }, { unique: true });
db.instancezones.createIndex({ zoneId: 1 }, { unique: true });
db.visits.createIndex({ userId: 1, zoneId: 1, periodId: 1 }, { unique: true });
