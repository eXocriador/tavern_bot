import crypto from 'crypto';
import express, { type Response } from 'express';
import { type AuthRequest, verifyTelegramAuth } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

router.post('/register', async (req: express.Request, res: Response) => {
  try {
    const { telegramId, username, firstName, lastName, password } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    const existingUser = await User.findOne({ telegramId });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({
      telegramId,
      username,
      firstName,
      lastName,
      password,
    });

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
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/telegram', verifyTelegramAuth, async (req: AuthRequest, res: Response) => {
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
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/webapp', async (req: express.Request, res: Response) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const pairs = initData.split('&');
    const paramsMap = new Map<string, string>();

    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        paramsMap.set(key, value);
      }
    }

    const hash = paramsMap.get('hash');
    if (!hash) {
      return res.status(400).json({ error: 'Hash is missing in initData' });
    }

    const buildDataCheckString = (decodeValues: boolean) => {
      const dataParams: string[] = [];
      paramsMap.forEach((value, key) => {
        if (key !== 'hash') {
          const finalValue = decodeValues ? decodeURIComponent(value) : value;
          dataParams.push(`${key}=${finalValue}`);
        }
      });
      return dataParams.sort().join('\n');
    };

    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    let dataCheckString = buildDataCheckString(false);
    let calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      dataCheckString = buildDataCheckString(true);
      calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    }

    if (calculatedHash !== hash) {
      return res.status(401).json({ error: 'Invalid authentication data' });
    }

    const userStr = paramsMap.get('user');
    if (!userStr) {
      return res.status(400).json({ error: 'User data not found' });
    }

    let userData: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    try {
      const decodedUserStr = decodeURIComponent(userStr);
      userData = JSON.parse(decodedUserStr);
    } catch {
      return res.status(400).json({ error: 'Invalid user data format' });
    }

    if (!userData.id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authDateStr = paramsMap.get('auth_date');
    const now = Date.now();
    let authDate = 0;

    if (authDateStr) {
      authDate = Number.parseInt(authDateStr, 10) * 1000;
    }

    if (authDateStr && now - authDate > 24 * 60 * 60 * 1000) {
      return res.status(401).json({ error: 'Authentication expired' });
    }

    let user = await User.findOne({ telegramId: userData.id });
    if (!user) {
      user = await User.create({
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
      });
    } else {
      user.username = userData.username;
      user.firstName = userData.first_name;
      user.lastName = userData.last_name;
      await user.save();
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
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
