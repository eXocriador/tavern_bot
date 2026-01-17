import express, { Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
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
      timezone: user.timezone,
      language: user.language,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { characterName, characterLevel, timezone, language } = req.body;

    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (characterName !== undefined) {
      user.characterName = characterName;
    }

    if (characterLevel !== undefined) {
      const level = Number(characterLevel);
      if (level >= 1 && level <= 100) {
        user.characterLevel = level;
      }
    }

    if (timezone !== undefined) {
      user.timezone = timezone;
    }

    if (language !== undefined) {
      user.language = language;
    }

    await user.save();

    res.json({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      characterName: user.characterName,
      characterLevel: user.characterLevel,
      timezone: user.timezone,
      language: user.language,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

