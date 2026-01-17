import express, { Response } from 'express';
import crypto from 'crypto';
import { verifyTelegramAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

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
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Web App authentication (from Telegram Mini App)
router.post('/webapp', async (req: express.Request, res: Response) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      console.error('Web App auth: initData is missing');
      return res.status(400).json({ error: 'initData is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('Web App auth: Bot token not configured');
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Parse initData (format: "key=value&key=value&hash=...")
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      console.error('Web App auth: Hash is missing in initData');
      return res.status(400).json({ error: 'Hash is missing in initData' });
    }

    params.delete('hash');

    // Build data check string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Verify hash
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      console.error('Web App auth: Hash verification failed', {
        calculated: calculatedHash.substring(0, 10) + '...',
        received: hash.substring(0, 10) + '...',
      });
      return res.status(401).json({ error: 'Invalid authentication data' });
    }

    // Parse user data
    const userStr = params.get('user');
    if (!userStr) {
      console.error('Web App auth: User data not found in initData');
      return res.status(400).json({ error: 'User data not found' });
    }

    let userData;
    try {
      userData = JSON.parse(userStr);
    } catch (error) {
      console.error('Web App auth: Failed to parse user data', error);
      return res.status(400).json({ error: 'Invalid user data format' });
    }

    if (!userData.id) {
      console.error('Web App auth: User ID is missing');
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authDateStr = params.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) * 1000 : Date.now();
    const now = Date.now();

    // Check auth_date (should be within 24 hours for Web App)
    if (authDateStr && now - authDate > 24 * 60 * 60 * 1000) {
      console.error('Web App auth: Authentication expired', {
        authDate: new Date(authDate).toISOString(),
        now: new Date(now).toISOString(),
      });
      return res.status(401).json({ error: 'Authentication expired' });
    }

    // Find or create user
    let user = await User.findOne({ telegramId: userData.id });
    if (!user) {
      user = await User.create({
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
      });
    } else {
      // Update user info
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
  } catch (error) {
    console.error('Web App auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dev mode login (only for development)
router.post('/dev', async (req: express.Request, res: Response) => {
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

