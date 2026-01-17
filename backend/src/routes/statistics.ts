import express, { Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Visit from '../models/Visit';
import User from '../models/User';
import InstanceZone from '../models/InstanceZone';
import UserZoneStats from '../models/UserZoneStats';
import { getCurrentPeriod, getAllPeriods } from '../utils/period';

const router = express.Router();

// Get my statistics
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const periodId = await getCurrentPeriod();
    const allInstances = await InstanceZone.find();
    const myVisits = await Visit.find({
      userId: req.user!._id,
      periodId,
    }).populate('zoneId', '_id zoneId name');

    const myStats = await UserZoneStats.find({
      userId: req.user!._id,
    }).populate('zoneId', 'zoneId name bossName');

    const visitedZoneIds = new Set(
      myVisits
        .filter((v) => v.zoneId)
        .map((v) => {
          // After populate, zoneId is an object with _id property
          const zoneIdObj = v.zoneId as any;
          return zoneIdObj?._id?.toString() || null;
        })
        .filter((id): id is string => id !== null)
    );
    const availableZones = allInstances.filter(
      (zone) => !visitedZoneIds.has(zone._id.toString())
    );

    const totalVisits = myStats.reduce((sum, stat) => sum + stat.totalVisits, 0);
    const completionRate = allInstances.length > 0
      ? (myVisits.length / allInstances.length) * 100
      : 0;

    res.json({
      currentPeriod: {
        visited: myVisits.length,
        available: availableZones.length,
        total: allInstances.length,
        completionRate: Math.round(completionRate * 100) / 100,
        visits: myVisits,
      },
      allTime: {
        totalVisits,
        zoneStats: myStats,
        mostVisited: myStats
          .sort((a, b) => b.totalVisits - a.totalVisits)
          .slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Get my statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get statistics for specific user
router.get('/user/:telegramId', async (req: express.Request, res: Response) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const periodId = await getCurrentPeriod();
    const allInstances = await InstanceZone.find();
    const userVisits = await Visit.find({
      userId: user._id,
      periodId,
    }).populate('zoneId', '_id zoneId name');

    const userStats = await UserZoneStats.find({
      userId: user._id,
    }).populate('zoneId', 'zoneId name bossName');

    const visitedZoneIds = new Set(
      userVisits
        .filter((v) => v.zoneId)
        .map((v) => {
          const zoneIdObj = v.zoneId as any;
          return zoneIdObj?._id?.toString() || null;
        })
        .filter((id): id is string => id !== null)
    );
    const availableZones = allInstances.filter(
      (zone) => !visitedZoneIds.has(zone._id.toString())
    );

    const totalVisits = userStats.reduce((sum, stat) => sum + stat.totalVisits, 0);
    const completionRate = allInstances.length > 0
      ? (userVisits.length / allInstances.length) * 100
      : 0;

    res.json({
      user: {
        telegramId: user.telegramId,
        username: user.username,
        characterName: user.characterName,
      },
      currentPeriod: {
        visited: userVisits.length,
        available: availableZones.length,
        total: allInstances.length,
        completionRate: Math.round(completionRate * 100) / 100,
        visits: userVisits,
      },
      allTime: {
        totalVisits,
        zoneStats: userStats,
        mostVisited: userStats
          .sort((a, b) => b.totalVisits - a.totalVisits)
          .slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get global statistics
router.get('/global', async (req: express.Request, res: Response) => {
  try {
    const periodId = await getCurrentPeriod();
    const allInstances = await InstanceZone.find();
    const allVisits = await Visit.find({ periodId });
    const allUsers = await User.find();
    const allStats = await UserZoneStats.find().populate('zoneId', 'zoneId name');

    // Zone popularity
    const zoneVisitCounts = new Map<string, number>();
    allVisits.forEach((visit) => {
      const zoneId = visit.zoneId.toString();
      zoneVisitCounts.set(zoneId, (zoneVisitCounts.get(zoneId) || 0) + 1);
    });

    const zonePopularity = allInstances.map((zone) => ({
      zoneId: zone.zoneId,
      name: zone.name,
      visits: zoneVisitCounts.get(zone._id.toString()) || 0,
    })).sort((a, b) => b.visits - a.visits);

    // All-time zone popularity (from UserZoneStats)
    const allTimeZoneCounts = new Map<string, number>();
    allStats.forEach((stat) => {
      const zoneId = (stat.zoneId as any)?._id?.toString() || stat.zoneId.toString();
      allTimeZoneCounts.set(zoneId, (allTimeZoneCounts.get(zoneId) || 0) + stat.totalVisits);
    });

    const allTimeZonePopularity = allInstances.map((zone) => ({
      zoneId: zone.zoneId,
      name: zone.name,
      visits: allTimeZoneCounts.get(zone._id.toString()) || 0,
    })).sort((a, b) => b.visits - a.visits);

    // Active users count
    const activeUserIds = new Set(allVisits.map((v) => v.userId.toString()));
    const activeUsersCount = activeUserIds.size;

    // Average visits per user
    const avgVisits = activeUsersCount > 0
      ? allVisits.length / activeUsersCount
      : 0;

    res.json({
      currentPeriod: {
        totalVisits: allVisits.length,
        activeUsers: activeUsersCount,
        totalUsers: allUsers.length,
        averageVisitsPerUser: Math.round(avgVisits * 100) / 100,
        zonePopularity: zonePopularity.slice(0, 10),
      },
      allTime: {
        totalVisits: allStats.reduce((sum, stat) => sum + stat.totalVisits, 0),
        mostPopularZones: allTimeZonePopularity.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Get global statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch global statistics' });
  }
});

// Get statistics for specific zone
router.get('/zone/:zoneId', async (req: express.Request, res: Response) => {
  try {
    const zone = await InstanceZone.findOne({ zoneId: req.params.zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const periodId = await getCurrentPeriod();
    const zoneVisits = await Visit.find({
      zoneId: zone._id,
      periodId,
    }).populate('userId', 'telegramId username characterName');

    const zoneStats = await UserZoneStats.find({
      zoneId: zone._id,
    })
      .populate('userId', 'telegramId username characterName')
      .sort({ totalVisits: -1 });

    res.json({
      zone: {
        zoneId: zone.zoneId,
        name: zone.name,
        bossName: zone.bossName,
        level: zone.level,
      },
      currentPeriod: {
        visits: zoneVisits.length,
        visitors: zoneVisits.map((v) => ({
          telegramId: (v.userId as any).telegramId,
          username: (v.userId as any).username,
          characterName: (v.userId as any).characterName,
          visitedAt: v.visitedAt,
        })),
      },
      allTime: {
        totalVisits: zoneStats.reduce((sum, stat) => sum + stat.totalVisits, 0),
        topVisitors: zoneStats.slice(0, 10).map((stat) => ({
          telegramId: (stat.userId as any).telegramId,
          username: (stat.userId as any).username,
          characterName: (stat.userId as any).characterName,
          totalVisits: stat.totalVisits,
          lastVisited: stat.lastVisited,
        })),
      },
    });
  } catch (error) {
    console.error('Get zone statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch zone statistics' });
  }
});

// Get period history
router.get('/periods', async (req: express.Request, res: Response) => {
  try {
    const periods = await getAllPeriods();
    res.json(periods);
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ error: 'Failed to fetch periods' });
  }
});

export default router;

