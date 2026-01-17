import express, { Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Character from '../models/Character';

const router = express.Router();

// Get all characters for current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const characters = await Character.find({ userId: req.user!._id }).sort({
      createdAt: -1,
    });
    res.json(characters);
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Create a new character
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname, profession, level } = req.body;

    if (!nickname || !profession || level === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const levelNum = Number(level);
    if (levelNum < 1 || levelNum > 100) {
      return res.status(400).json({ error: 'Level must be between 1 and 100' });
    }

    const character = new Character({
      userId: req.user!._id,
      nickname: nickname.trim(),
      profession: profession.trim(),
      level: levelNum,
    });

    await character.save();
    res.status(201).json(character);
  } catch (error) {
    console.error('Create character error:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// Update a character
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname, profession, level } = req.body;
    const characterId = req.params.id;

    const character = await Character.findOne({
      _id: characterId,
      userId: req.user!._id,
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (nickname !== undefined) {
      character.nickname = nickname.trim();
    }

    if (profession !== undefined) {
      character.profession = profession.trim();
    }

    if (level !== undefined) {
      const levelNum = Number(level);
      if (levelNum < 1 || levelNum > 100) {
        return res.status(400).json({ error: 'Level must be between 1 and 100' });
      }
      character.level = levelNum;
    }

    await character.save();
    res.json(character);
  } catch (error) {
    console.error('Update character error:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// Delete a character
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const characterId = req.params.id;

    const character = await Character.findOneAndDelete({
      _id: characterId,
      userId: req.user!._id,
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

export default router;
