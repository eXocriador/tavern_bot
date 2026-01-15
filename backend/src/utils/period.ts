import Period from '../models/Period';

export const getCurrentPeriod = async (): Promise<string> => {
  const activePeriod = await Period.findOne({ isActive: true });
  if (activePeriod) {
    return activePeriod.periodId;
  }

  // Create new period if none exists
  const periodId = `period_${Date.now()}`;
  await Period.create({
    periodId,
    startDate: new Date(),
    isActive: true,
  });

  return periodId;
};

export const createNewPeriod = async (): Promise<string> => {
  // Deactivate all current periods
  await Period.updateMany({ isActive: true }, { isActive: false, endDate: new Date() });

  // Create new period
  const periodId = `period_${Date.now()}`;
  await Period.create({
    periodId,
    startDate: new Date(),
    isActive: true,
  });

  return periodId;
};

export const getAllPeriods = async () => {
  return await Period.find().sort({ startDate: -1 });
};

