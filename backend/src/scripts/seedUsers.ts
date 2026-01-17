import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Character from '../models/Character';

dotenv.config();

// Популярні ніки з Lineage 2 та їх професії та рівні
const usersData = [
  {
    telegramId: 1000001,
    username: 'dvp',
    firstName: 'DVP',
    characters: [
      { nickname: 'dvp', profession: 'Dark Avenger', level: 85 },
      { nickname: 'dvp_alt', profession: 'Palus Knight', level: 82 },
    ],
  },
  {
    telegramId: 1000002,
    username: 'DAnielDefo',
    firstName: 'DAnielDefo',
    characters: [
      { nickname: 'DAnielDefo', profession: 'Tyrant', level: 87 },
      { nickname: 'Daniel_Alt', profession: 'Destroyer', level: 80 },
    ],
  },
  {
    telegramId: 1000003,
    username: 'глад',
    firstName: 'Глад',
    characters: [
      { nickname: 'глад', profession: 'Warlord', level: 86 },
      { nickname: 'Глад_Альт', profession: 'Gladiator', level: 83 },
    ],
  },
  {
    telegramId: 1000004,
    username: 'валакас',
    firstName: 'Валакас',
    characters: [
      { nickname: 'валакас', profession: 'Shillien Knight', level: 88 },
      { nickname: 'Валакас_Мейн', profession: 'Dark Knight', level: 85 },
    ],
  },
  {
    telegramId: 1000005,
    username: 'ShadowHunter',
    firstName: 'Shadow',
    characters: [
      { nickname: 'ShadowHunter', profession: 'Dark Ranger', level: 84 },
      { nickname: 'Shadow_Mage', profession: 'Spellhowler', level: 81 },
    ],
  },
  {
    telegramId: 1000006,
    username: 'DragonSlayer',
    firstName: 'Dragon',
    characters: [
      { nickname: 'DragonSlayer', profession: 'Dragon Knight', level: 89 },
      { nickname: 'Dragon_Mage', profession: 'Soultaker', level: 82 },
    ],
  },
  {
    telegramId: 1000007,
    username: 'BloodMage',
    firstName: 'Blood',
    characters: [
      { nickname: 'BloodMage', profession: 'Necromancer', level: 85 },
      { nickname: 'Blood_Alt', profession: 'Warlock', level: 80 },
    ],
  },
  {
    telegramId: 1000008,
    username: 'IronWarrior',
    firstName: 'Iron',
    characters: [
      { nickname: 'IronWarrior', profession: 'Titan', level: 87 },
      { nickname: 'Iron_Tank', profession: 'Paladin', level: 84 },
    ],
  },
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tavern_bot');
    console.log('✅ Connected to MongoDB');

    // Clear existing seed users (by telegramId range)
    const seedTelegramIds = usersData.map(u => u.telegramId);
    await User.deleteMany({ telegramId: { $in: seedTelegramIds } });
    console.log('🗑️  Cleared existing seed users');

    // Create users and their characters
    for (const userData of usersData) {
      const { telegramId, username, firstName, characters } = userData;

      // Check if user already exists
      let user = await User.findOne({ telegramId });
      if (!user) {
        user = await User.create({
          telegramId,
          username,
          firstName,
          language: 'ua',
          timezone: 'Europe/Kiev',
        });
        console.log(`✅ Created user: ${username} (${telegramId})`);
      } else {
        console.log(`ℹ️  User already exists: ${username} (${telegramId})`);
      }

      // Clear existing characters for this user
      await Character.deleteMany({ userId: user._id });

      // Create characters
      for (const charData of characters) {
        await Character.create({
          userId: user._id,
          nickname: charData.nickname,
          profession: charData.profession,
          level: charData.level,
        });
        console.log(`  ✅ Created character: ${charData.nickname} (${charData.profession}, Lvl ${charData.level})`);
      }
    }

    console.log('🎉 Seeding users completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedUsers();
