import express from 'express';
import Visit from '../models/Visit';
import InstanceZone from '../models/InstanceZone';
import User from '../models/User';
import UserZoneStats from '../models/UserZoneStats';
import { getCurrentPeriod } from '../utils/period';

const router = express.Router();

// Ensure user exists (create if not exists)
router.post('/ensure-user', async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    let user = await User.findOne({ telegramId });
    if (!user) {
      user = await User.create({
        telegramId,
        username,
        firstName,
        lastName,
      });
    } else {
      // Update user info if provided
      if (username !== undefined) user.username = username;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      await user.save();
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Ensure user error:', error);
    res.status(500).json({ error: 'Failed to ensure user' });
  }
});

// Bot-specific routes that accept telegramId directly
// These routes are for Telegram bot usage

// Get visits for user by telegramId
router.get('/visits/:telegramId', async (req, res) => {
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
    console.error('Get bot visits error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Mark visit by telegramId and zoneId
router.post('/visits/:telegramId/:zoneId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const zone = await InstanceZone.findOne({ zoneId: req.params.zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Instance zone not found' });
    }

    const periodId = await getCurrentPeriod();

    // Check if already visited
    const existingVisit = await Visit.findOne({
      userId: user._id,
      zoneId: zone._id,
      periodId,
    });

    if (existingVisit) {
      return res.status(400).json({ error: 'Already visited this zone in current period' });
    }

    // Create visit
    const visit = await Visit.create({
      userId: user._id,
      zoneId: zone._id,
      periodId,
      visitedAt: new Date(),
    });

    // Update stats
    let stats = await UserZoneStats.findOne({
      userId: user._id,
      zoneId: zone._id,
    });

    if (!stats) {
      stats = await UserZoneStats.create({
        userId: user._id,
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
    console.error('Bot mark visit error:', error);
    res.status(500).json({ error: 'Failed to mark visit' });
  }
});

// Remove visit by telegramId and zoneId
router.delete('/visits/:telegramId/:zoneId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const zone = await InstanceZone.findOne({ zoneId: req.params.zoneId });
    if (!zone) {
      return res.status(404).json({ error: 'Instance zone not found' });
    }

    const periodId = await getCurrentPeriod();

    const visit = await Visit.findOneAndDelete({
      userId: user._id,
      zoneId: zone._id,
      periodId,
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json({ success: true, message: 'Visit removed' });
  } catch (error) {
    console.error('Bot remove visit error:', error);
    res.status(500).json({ error: 'Failed to remove visit' });
  }
});

// Get user by telegramId
router.get('/user/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      characterName: user.characterName,
      characterLevel: user.characterLevel,
    });
  } catch (error) {
    console.error('Get bot user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user level by telegramId
router.put('/user/:telegramId/level', async (req, res) => {
  try {
    const { level } = req.body;
    const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (level < 1 || level > 100) {
      return res.status(400).json({ error: 'Level must be between 1 and 100' });
    }

    user.characterLevel = level;
    await user.save();

    res.json({
      telegramId: user.telegramId,
      characterLevel: user.characterLevel,
    });
  } catch (error) {
    console.error('Update bot user level error:', error);
    res.status(500).json({ error: 'Failed to update level' });
  }
});

// Get top players
router.get('/top-players', async (req, res) => {
  try {
    const topPlayers = await UserZoneStats.aggregate([
      {
        $group: {
          _id: '$userId',
          totalVisits: { $sum: '$totalVisits' },
        },
      },
      {
        $sort: { totalVisits: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          telegramId: '$user.telegramId',
          username: '$user.username',
          characterName: '$user.characterName',
          characterLevel: '$user.characterLevel',
          totalVisits: 1,
        },
      },
    ]);

    res.json(topPlayers);
  } catch (error) {
    console.error('Get top players error:', error);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

export default router;

