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
    // Telegram sends initData as URL-encoded string
    // We need to parse it carefully to preserve original encoding for hash verification

    // Split by & to get individual parameters
    const pairs = initData.split('&');
    const paramsMap = new Map<string, string>();

    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=');
      const value = valueParts.join('='); // Rejoin in case value contains =
      if (key && value) {
        paramsMap.set(key, value);
      }
    }

    const hash = paramsMap.get('hash');
    if (!hash) {
      console.error('Web App auth: Hash is missing in initData');
      return res.status(400).json({ error: 'Hash is missing in initData' });
    }

    // Build data check string for hash verification
    // According to Telegram docs: sort keys alphabetically, join with \n
    // Try with original URL-encoded values first (standard case)
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

    // Verify hash
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    // Try with original encoded values first (standard Telegram behavior)
    let dataCheckString = buildDataCheckString(false);
    let calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // If hash doesn't match, try with decoded values (in case initData was already decoded)
    if (calculatedHash !== hash) {
      dataCheckString = buildDataCheckString(true);
      calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    }

    if (calculatedHash !== hash) {
      console.error('Web App auth: Hash verification failed', {
        calculated: calculatedHash.substring(0, 10) + '...',
        received: hash.substring(0, 10) + '...',
        dataCheckString: dataCheckString.substring(0, 100) + '...',
      });
      return res.status(401).json({ error: 'Invalid authentication data' });
    }

    console.log('Web App auth: Hash verification successful');

    // Parse user data (now decode for parsing JSON)
    const userStr = paramsMap.get('user');
    if (!userStr) {
      console.error('Web App auth: User data not found in initData');
      return res.status(400).json({ error: 'User data not found' });
    }

    let userData;
    try {
      // Decode URL-encoded user string before parsing JSON
      const decodedUserStr = decodeURIComponent(userStr);
      userData = JSON.parse(decodedUserStr);
    } catch (error) {
      console.error('Web App auth: Failed to parse user data', error);
      return res.status(400).json({ error: 'Invalid user data format' });
    }

    if (!userData.id) {
      console.error('Web App auth: User ID is missing');
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authDateStr = paramsMap.get('auth_date');
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
      console.log('Web App auth: Creating new user', { telegramId: userData.id });
      user = await User.create({
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
      });
    } else {
      // Update user info
      console.log('Web App auth: Updating existing user', { telegramId: userData.id });
      user.username = userData.username;
      user.firstName = userData.first_name;
      user.lastName = userData.last_name;
      await user.save();
    }

    console.log('Web App auth: Authentication successful', {
      telegramId: user.telegramId,
      username: user.username,
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

