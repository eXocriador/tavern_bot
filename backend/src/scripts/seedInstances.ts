import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InstanceZone from '../models/InstanceZone';
import Period from '../models/Period';

dotenv.config();

// List of party instance zones for Lineage 2 High Five Chronicles
const instances = [
  {
    zoneId: 'zaken_nighttime',
    name: 'Zaken Nighttime',
    bossName: 'Nighttime Zaken',
  },
  {
    zoneId: 'zaken_daytime',
    name: 'Zaken Daytime',
    bossName: 'Daytime Zaken',
  },
  {
    zoneId: 'freya_normal',
    name: 'Freya Normal',
    bossName: 'Freya Castle – Normal',
  },
  {
    zoneId: 'freya_hard',
    name: 'Freya Hard',
    bossName: 'Freya Castle – Hard',
  },
  {
    zoneId: 'frintezza',
    name: 'Frintezza',
    bossName: 'Frintezza',
  },
  {
    zoneId: 'seed_destruction',
    name: 'Seed of Destruction',
    bossName: 'Tiat',
  },
  {
    zoneId: 'seed_infinity_suffering',
    name: 'Hall of Suffering',
    bossName: 'Seed of Infinity – Twins',
  },
  {
    zoneId: 'seed_infinity_erosion',
    name: 'Hall of Erosion',
    bossName: 'Seed of Infinity – Cohemenes',
  },
  {
    zoneId: 'seed_infinity_heart',
    name: 'Heart of Infinity',
    bossName: 'Ekimus',
  },
  {
    zoneId: 'rim_kamaloka',
    name: 'Rim Kamaloka',
    bossName: 'Rim Kamaloka Boss',
  },
  {
    zoneId: 'kamaloka_hall_abyss',
    name: 'Kamaloka – Hall of the Abyss',
    bossName: 'Hall of the Abyss Boss',
  },
  {
    zoneId: 'kamaloka_labyrinth',
    name: 'Kamaloka – Labyrinth of the Abyss',
    bossName: 'Labyrinth Boss',
  },
  {
    zoneId: 'fortress_instance',
    name: 'Fortress Instance',
    bossName: 'Fortress Boss',
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

