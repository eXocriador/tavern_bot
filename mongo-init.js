db = db.getSiblingDB('tavern_bot');

db.createUser({
  user: 'tavern_user',
  pwd: 'tavern_password',
  roles: [
    {
      role: 'readWrite',
      db: 'tavern_bot',
    },
  ],
});
