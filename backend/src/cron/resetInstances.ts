import cron from 'node-cron';
import { createNewPeriod } from '../utils/period';

export const setupCronJobs = () => {
  cron.schedule('0 8 * * 1,3', async () => {
    try {
      const newPeriodId = await createNewPeriod();
    } catch (error) {}
  });
};
