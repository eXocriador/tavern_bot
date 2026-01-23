import express, { type Response } from 'express';
import { type AuthRequest, requireAuth } from '../middleware/auth';
import Character from '../models/Character';
import User from '../models/User';

const router = express.Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const character = await Character.findOne({ userId: user._id });

    res.json({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      character: character
        ? {
            nickname: character.nickname,
            profession: character.profession,
            level: character.level,
          }
        : null,
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
    const { nickname, profession, level, timezone, language } = req.body;

    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let character = await Character.findOne({ userId: user._id });

    if (!character) {
      character = await Character.create({
        userId: user._id,
        nickname: nickname || user.username || `User${user.telegramId}`,
        profession: profession || 'Adventurer',
        level: level || 1,
      });
    } else {
      if (nickname !== undefined) {
        character.nickname = nickname;
      }
      if (profession !== undefined) {
        character.profession = profession;
      }
      if (level !== undefined) {
        const levelNum = Number(level);
        if (levelNum >= 1 && levelNum <= 100) {
          character.level = levelNum;
        }
      }
      await character.save();
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
      character: {
        nickname: character.nickname,
        profession: character.profession,
        level: character.level,
      },
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
