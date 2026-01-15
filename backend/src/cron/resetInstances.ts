import cron from 'node-cron';
import { createNewPeriod } from '../utils/period';

// Kyiv timezone: EET/EEST (UTC+2/+3)
// Monday and Wednesday at 10:00 AM Kyiv time
// Using Europe/Kyiv timezone
// Note: node-cron doesn't support timezones directly, so we use UTC
// Kyiv is UTC+2 in winter (EET) and UTC+3 in summer (EEST)
// 10:00 Kyiv = 08:00 UTC (winter) or 07:00 UTC (summer)
// We'll use 07:00 UTC which gives us 10:00 EEST (summer) or 09:00 EET (winter)
// For exact 10:00 Kyiv, you may need to adjust manually or use a timezone library

export const setupCronJobs = () => {
  // Monday at 07:00 UTC (10:00 EEST summer, 09:00 EET winter)
  cron.schedule('0 7 * * 1', async () => {
    const kyivTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
    console.log(`🔄 Monday reset: Creating new period... (Kyiv time: ${kyivTime})`);
    try {
      const newPeriodId = await createNewPeriod();
      console.log(`✅ New period created: ${newPeriodId}`);
    } catch (error) {
      console.error('❌ Error creating new period:', error);
    }
  });

  // Wednesday at 07:00 UTC (10:00 EEST summer, 09:00 EET winter)
  cron.schedule('0 7 * * 3', async () => {
    const kyivTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
    console.log(`🔄 Wednesday reset: Creating new period... (Kyiv time: ${kyivTime})`);
    try {
      const newPeriodId = await createNewPeriod();
      console.log(`✅ New period created: ${newPeriodId}`);
    } catch (error) {
      console.error('❌ Error creating new period:', error);
    }
  });

  console.log('✅ Cron jobs scheduled for Monday and Wednesday at ~10:00 AM Kyiv time (07:00 UTC)');
};

