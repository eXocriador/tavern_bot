import express, { Response } from 'express';
import crypto from 'crypto';
import { verifyTelegramAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// Telegram Login Widget authentication (legacy, kept for compatibility)
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

// Web App authentication (from Telegram Mini App) - automatic login
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
      console.error('Web App auth: Hash is missing in initData');
      return res.status(400).json({ error: 'Hash is missing in initData' });
    }

    // Build data check string for hash verification
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

    let dataCheckString = buildDataCheckString(false);
    let calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      dataCheckString = buildDataCheckString(true);
      calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    }

    if (calculatedHash !== hash) {
      console.error('Web App auth: Hash verification failed');
      return res.status(401).json({ error: 'Invalid authentication data' });
    }

    // Parse user data
    const userStr = paramsMap.get('user');
    if (!userStr) {
      console.error('Web App auth: User data not found in initData');
      return res.status(400).json({ error: 'User data not found' });
    }

    let userData;
    try {
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
      console.error('Web App auth: Authentication expired');
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

// Register new user (web version only)
// Also allows setting password for existing users without password
router.post('/register', async (req: express.Request, res: Response) => {
  try {
    const { telegramId, password } = req.body;

    if (!telegramId || !password) {
      return res.status(400).json({ error: 'Telegram ID and password are required' });
    }

    if (isNaN(Number(telegramId))) {
      return res.status(400).json({ error: 'Invalid Telegram ID' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (existingUser) {
      // If user exists and already has password, return error
      if (existingUser.password) {
        return res.status(400).json({ error: 'User with this Telegram ID already exists. Please login instead.' });
      }
      // If user exists but has no password, set password
      existingUser.password = password;
      await existingUser.save();

      return res.json({
        success: true,
        user: {
          telegramId: existingUser.telegramId,
          username: existingUser.username,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          characterName: existingUser.characterName,
        },
      });
    }

    // Create new user with password
    const user = await User.create({
      telegramId: Number(telegramId),
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
  } catch (error: any) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this Telegram ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login with telegramId and password (web version)
router.post('/login', async (req: express.Request, res: Response) => {
  try {
    const { telegramId, password } = req.body;

    if (!telegramId || !password) {
      return res.status(400).json({ error: 'Telegram ID and password are required' });
    }

    // Find user and include password
    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has password set
    if (!user.password) {
      return res.status(401).json({
        error: 'Password not set',
        needsPassword: true,
        message: 'Please set a password first. You can do this on the registration page.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (requires authentication)
router.post('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const telegramId = req.headers['x-telegram-id'];
    if (!telegramId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find user with password
    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has password set
    if (!user.password) {
      return res.status(400).json({ error: 'Password not set. Please set password first.' });
    }

    // Verify old password
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset code
router.post('/forgot-password', async (req: express.Request, res: Response) => {
  try {
    const { telegramId } = req.body;

    if (!telegramId || isNaN(Number(telegramId))) {
      return res.status(400).json({ error: 'Valid Telegram ID is required' });
    }

    const user = await User.findOne({ telegramId: Number(telegramId) });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ success: true, message: 'If user exists, reset code will be sent' });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetCode = resetCode;
    user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Send code via Telegram Bot
    try {
      const TelegramBot = require('node-telegram-bot-api');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const bot = new TelegramBot(botToken);
        await bot.sendMessage(
          Number(telegramId),
          `🔐 Код для восстановления пароля:\n\n\`${resetCode}\`\n\n⏱ Код действителен 15 минут.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (botError) {
      console.error('Error sending reset code via bot:', botError);
      // Continue even if bot fails
    }

    res.json({
      success: true,
      message: 'Reset code has been sent to your Telegram',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with code or old password
router.post('/reset-password', async (req: express.Request, res: Response) => {
  try {
    const { telegramId, newPassword, resetCode, oldPassword } = req.body;

    if (!telegramId || !newPassword) {
      return res.status(400).json({ error: 'Telegram ID and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (!resetCode && !oldPassword) {
      return res.status(400).json({ error: 'Either reset code or old password is required' });
    }

    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify reset code or old password
    if (resetCode) {
      if (!user.passwordResetCode || user.passwordResetCode !== resetCode) {
        return res.status(401).json({ error: 'Invalid reset code' });
      }
      if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
        return res.status(401).json({ error: 'Reset code expired' });
      }
    } else if (oldPassword) {
      if (!user.password) {
        return res.status(400).json({ error: 'Password not set' });
      }
      const isPasswordValid = await user.comparePassword(oldPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid old password' });
      }
    }

    // Update password
    user.password = newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set password for existing user without password (no authentication required)
router.post('/set-password', async (req: express.Request, res: Response) => {
  try {
    const { telegramId, password } = req.body;

    if (!telegramId || !password) {
      return res.status(400).json({ error: 'Telegram ID and password are required' });
    }

    if (isNaN(Number(telegramId))) {
      return res.status(400).json({ error: 'Invalid Telegram ID' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user and include password
    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has password
    if (user.password) {
      return res.status(400).json({ error: 'Password already set. Use change-password or reset-password instead.' });
    }

    // Set password
    user.password = password;
    await user.save();

    res.json({
      success: true,
      message: 'Password set successfully',
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        characterName: user.characterName,
      },
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
