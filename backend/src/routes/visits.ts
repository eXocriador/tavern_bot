import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Visit from '../models/Visit';
import InstanceZone from '../models/InstanceZone';
import User from '../models/User';
import UserZoneStats from '../models/UserZoneStats';
import { getCurrentPeriod } from '../utils/period';

const router = express.Router();

// Get my visits for current period
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const periodId = await getCurrentPeriod();
    const visits = await Visit.find({
      userId: req.user!._id,
      periodId,
    }).populate('zoneId', 'zoneId name bossName level');

    res.json(visits);
  } catch (error) {
    console.error('Get my visits error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Get visits for specific user
router.get('/user/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const periodId = await getCurrentPeriod();
    const visits = await Visit.find({
      userId: user._id,
      periodId,
    }).populate('zoneId', 'zoneId name bossName level');

    res.json(visits);
  } catch (error) {
    console.error('Get user visits error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Mark visit
router.post('/:zoneId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const zone = await InstanceZone.findOne({ zoneId: req.params.zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Instance zone not found' });
    }

    const periodId = await getCurrentPeriod();

    // Check if already visited
    const existingVisit = await Visit.findOne({
      userId: req.user!._id,
      zoneId: zone._id,
      periodId,
    });

    if (existingVisit) {
      return res.status(400).json({ error: 'Already visited this zone in current period' });
    }

    // Create visit
    const visit = await Visit.create({
      userId: req.user!._id,
      zoneId: zone._id,
      periodId,
      visitedAt: new Date(),
    });

    // Update stats
    let stats = await UserZoneStats.findOne({
      userId: req.user!._id,
      zoneId: zone._id,
    });

    if (!stats) {
      stats = await UserZoneStats.create({
        userId: req.user!._id,
        zoneId: zone._id,
        totalVisits: 1,
        lastVisited: new Date(),
      });
    } else {
      stats.totalVisits += 1;
      stats.lastVisited = new Date();
      await stats.save();
    }

    const populatedVisit = await Visit.findById(visit._id).populate(
      'zoneId',
      'zoneId name bossName level'
    );

    res.json(populatedVisit);
  } catch (error) {
    console.error('Mark visit error:', error);
    res.status(500).json({ error: 'Failed to mark visit' });
  }
});

// Remove visit
router.delete('/:zoneId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const zone = await InstanceZone.findOne({ zoneId: req.params.zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Instance zone not found' });
    }

    const periodId = await getCurrentPeriod();

    const visit = await Visit.findOneAndDelete({
      userId: req.user!._id,
      zoneId: zone._id,
      periodId,
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Remove visit error:', error);
    res.status(500).json({ error: 'Failed to remove visit' });
  }
});

export default router;

