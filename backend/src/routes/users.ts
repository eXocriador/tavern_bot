import express from 'express';
import { requireAuth } from '../middleware/auth';
import User from '../models/User';
import Character from '../models/Character';

const router = express.Router();

// Get all users with their characters
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await User.find({}, 'telegramId username').lean();
    const usersWithCharacters = await Promise.all(
      users.map(async (user) => {
        const characters = await Character.find({ userId: user._id });
        return {
          ...user,
          characters: characters.map((c) => ({
            _id: c._id.toString(),
            nickname: c.nickname,
            profession: c.profession,
            level: c.level,
          })),
        };
      })
    );

    res.json(usersWithCharacters);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
