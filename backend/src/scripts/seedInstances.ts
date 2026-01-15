import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InstanceZone from '../models/InstanceZone';
import Period from '../models/Period';

dotenv.config();

// List of group instance zones for Lineage 2 High Five
const instances = [
  {
    zoneId: 'kamaloka_hall_abyss',
    name: 'Kamaloka - Hall of the Abyss',
    bossName: 'Hall of the Abyss Boss',
    level: 50,
    description: 'Group instance requiring tank and healer',
  },
  {
    zoneId: 'zaken_daytime',
    name: 'Zaken (Daytime)',
    bossName: 'Zaken',
    level: 55,
    description: 'Daytime Zaken instance for party',
  },
  {
    zoneId: 'zaken_nighttime',
    name: 'Zaken (Nighttime)',
    bossName: 'Zaken',
    level: 55,
    description: 'Nighttime Zaken instance for party',
  },
  {
    zoneId: 'zaken_hard',
    name: 'Zaken (Hard)',
    bossName: 'Zaken',
    level: 65,
    description: 'Hard mode Zaken instance',
  },
  {
    zoneId: 'seed_destruction',
    name: 'Seed of Destruction',
    bossName: 'Tiat',
    level: 78,
    description: 'Raid boss instance for high level parties',
  },
  {
    zoneId: 'seed_infinity',
    name: 'Seed of Infinity',
    bossName: 'Twins',
    level: 75,
    description: 'Hall of Suffering - requires full party',
  },
  {
    zoneId: 'freya_normal',
    name: 'Freya (Normal)',
    bossName: 'Freya',
    level: 82,
    description: 'Normal Freya instance',
  },
  {
    zoneId: 'freya_hard',
    name: 'Freya (Hard)',
    bossName: 'Freya',
    level: 82,
    description: 'Hard Freya instance for experienced groups',
  },
  {
    zoneId: 'frintezza',
    name: 'Frintezza',
    bossName: 'Frintezza',
    level: 80,
    description: 'Traditional raid boss instance',
  },
  {
    zoneId: 'antharas',
    name: 'Antharas',
    bossName: 'Antharas',
    level: 79,
    description: 'Epic raid boss - requires large raid',
  },
  {
    zoneId: 'valakas',
    name: 'Valakas',
    bossName: 'Valakas',
    level: 85,
    description: 'Epic raid boss - requires large raid',
  },
  {
    zoneId: 'baium',
    name: 'Baium',
    bossName: 'Baium',
    level: 75,
    description: 'Raid boss instance',
  },
];

const seedInstances = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tavern_bot');
    console.log('✅ Connected to MongoDB');

    // Clear existing instances
    await InstanceZone.deleteMany({});
    console.log('🗑️  Cleared existing instances');

    // Insert instances
    const inserted = await InstanceZone.insertMany(instances);
    console.log(`✅ Inserted ${inserted.length} instance zones`);

    // Create initial period if none exists
    const existingPeriod = await Period.findOne({ isActive: true });
    if (!existingPeriod) {
      const periodId = `period_${Date.now()}`;
      await Period.create({
        periodId,
        startDate: new Date(),
        isActive: true,
      });
      console.log(`✅ Created initial period: ${periodId}`);
    }

    console.log('🎉 Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedInstances();

