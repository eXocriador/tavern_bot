import express from 'express';
import { verifyTelegramAuth } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

router.post('/telegram', verifyTelegramAuth, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.body.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        characterName: user.characterName,
      },
    });
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dev mode login (only for development)
router.post('/dev', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Dev mode not available in production' });
    }

    const { id, username, first_name } = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Invalid Telegram ID' });
    }

    // Find or create user
    let user = await User.findOne({ telegramId: Number(id) });
    if (!user) {
      user = await User.create({
        telegramId: Number(id),
        username: username || `dev_${id}`,
        firstName: first_name || 'Dev',
      });
    }

    res.json({
      success: true,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        characterName: user.characterName,
      },
    });
  } catch (error) {
    console.error('Dev auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

