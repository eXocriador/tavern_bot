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

export default router;

