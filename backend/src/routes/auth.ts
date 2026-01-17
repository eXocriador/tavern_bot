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

    console.log(`Login attempt for Telegram ID: ${telegramId}`);

    // Find user and include password
    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      console.error(`Login: User not found for Telegram ID: ${telegramId}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has password set
    if (!user.password) {
      console.log(`Login: Password not set for Telegram ID: ${telegramId}`);
      return res.status(401).json({
        error: 'Password not set',
        needsPassword: true,
        message: 'Please set a password first. You can do this on the registration page.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.error(`Login: Invalid password for Telegram ID: ${telegramId}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`Login: Success for Telegram ID: ${telegramId}`);

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
router.post('/change-password', async (req: express.Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    console.log('[CHANGE-PASSWORD] Request received');
    console.log('[CHANGE-PASSWORD] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[CHANGE-PASSWORD] Body keys:', Object.keys(req.body));

    if (!oldPassword || !newPassword) {
      console.error('[CHANGE-PASSWORD] Missing required fields');
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      console.error('[CHANGE-PASSWORD] New password too short');
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const telegramId = req.headers['x-telegram-id'];
    console.log(`[CHANGE-PASSWORD] Telegram ID from header: ${telegramId}`);

    if (!telegramId) {
      console.error('[CHANGE-PASSWORD] No telegramId in headers');
      console.error('[CHANGE-PASSWORD] All headers:', JSON.stringify(req.headers, null, 2));
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`[CHANGE-PASSWORD] Change password request for Telegram ID: ${telegramId}`);

    // Find user with password
    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      console.error(`[CHANGE-PASSWORD] User not found for Telegram ID: ${telegramId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[CHANGE-PASSWORD] User found for Telegram ID: ${telegramId}, has password: ${!!user.password}`);

    // Check if user has password set
    if (!user.password) {
      console.error(`[CHANGE-PASSWORD] Password not set for Telegram ID: ${telegramId}`);
      return res.status(400).json({ error: 'Password not set. Please set password first.' });
    }

    // Verify old password
    console.log(`[CHANGE-PASSWORD] Verifying old password for Telegram ID: ${telegramId}`);
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      console.error(`[CHANGE-PASSWORD] Invalid old password for Telegram ID: ${telegramId}`);
      return res.status(401).json({ error: 'Invalid old password' });
    }

    console.log(`[CHANGE-PASSWORD] Old password verified, updating password for Telegram ID: ${telegramId}`);

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`[CHANGE-PASSWORD] Password changed successfully for Telegram ID: ${telegramId}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset code
router.post('/forgot-password', async (req: express.Request, res: Response) => {
  try {
    const { telegramId } = req.body;

    console.log(`[FORGOT-PASSWORD] Request received for Telegram ID: ${telegramId}`);

    if (!telegramId || isNaN(Number(telegramId))) {
      console.error(`[FORGOT-PASSWORD] Invalid Telegram ID: ${telegramId}`);
      return res.status(400).json({ error: 'Valid Telegram ID is required' });
    }

    const user = await User.findOne({ telegramId: Number(telegramId) });
    if (!user) {
      console.log(`[FORGOT-PASSWORD] User not found for Telegram ID: ${telegramId}`);
      // Don't reveal if user exists for security
      return res.json({ success: true, message: 'If user exists, reset code will be sent' });
    }

    console.log(`[FORGOT-PASSWORD] User found, generating reset code for Telegram ID: ${telegramId}`);

    // Generate 4-digit code (1000-9999)
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    user.passwordResetCode = resetCode;
    user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    console.log(`[FORGOT-PASSWORD] Reset code generated: ${resetCode}, expires at: ${user.passwordResetExpiry}`);

    // Send code via Telegram Bot
    try {
      const TelegramBot = require('node-telegram-bot-api');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('[FORGOT-PASSWORD] TELEGRAM_BOT_TOKEN not configured');
        return res.status(500).json({ error: 'Bot token not configured' });
      }

      console.log(`[FORGOT-PASSWORD] Attempting to send message via Telegram Bot to user ${telegramId}`);
      const bot = new TelegramBot(botToken);
      await bot.sendMessage(
        Number(telegramId),
        `🔐 Код для восстановления пароля:\n\n\`${resetCode}\`\n\n⏱ Код действителен 15 минут.`,
        { parse_mode: 'Markdown' }
      );
      console.log(`[FORGOT-PASSWORD] Password reset code sent successfully to Telegram ID: ${telegramId}`);
    } catch (botError: any) {
      console.error('[FORGOT-PASSWORD] Error sending reset code via bot:', botError);
      console.error('[FORGOT-PASSWORD] Error details:', JSON.stringify(botError.response?.body || botError.message));

      // Check for 403 error (user hasn't started chat)
      if (botError.response?.body?.error_code === 403 || botError.code === 'ETELEGRAM' && botError.response?.body?.error_code === 403) {
        console.error(`[FORGOT-PASSWORD] Bot cannot send message to user ${telegramId}. User may need to start chat with bot first.`);
        return res.status(400).json({
          error: 'Cannot send code. Please start a chat with the bot first by sending /start command.',
          code: 'BOT_CHAT_REQUIRED'
        });
      }

      // For other errors, return error but don't reveal if user exists
      console.error(`[FORGOT-PASSWORD] Failed to send reset code, but user exists. Returning generic error.`);
      return res.status(500).json({
        error: 'Failed to send reset code. Please try again later or contact support.',
        code: 'SEND_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Reset code has been sent to your Telegram',
    });
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with code or old password
router.post('/reset-password', async (req: express.Request, res: Response) => {
  try {
    const { telegramId, newPassword, resetCode, oldPassword } = req.body;

    console.log(`[RESET-PASSWORD] Request received for Telegram ID: ${telegramId}, hasCode: ${!!resetCode}, hasOldPassword: ${!!oldPassword}`);

    if (!telegramId || !newPassword) {
      console.error('[RESET-PASSWORD] Missing required fields');
      return res.status(400).json({ error: 'Telegram ID and new password are required' });
    }

    if (newPassword.length < 6) {
      console.error('[RESET-PASSWORD] New password too short');
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (!resetCode && !oldPassword) {
      console.error('[RESET-PASSWORD] Neither reset code nor old password provided');
      return res.status(400).json({ error: 'Either reset code or old password is required' });
    }

    const user = await User.findOne({ telegramId: Number(telegramId) }).select('+password');
    if (!user) {
      console.error(`[RESET-PASSWORD] User not found for Telegram ID: ${telegramId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[RESET-PASSWORD] User found, stored reset code: ${user.passwordResetCode ? 'exists' : 'none'}, expiry: ${user.passwordResetExpiry || 'none'}`);

    // Verify reset code or old password
    if (resetCode) {
      console.log(`[RESET-PASSWORD] Verifying reset code for Telegram ID: ${telegramId}, provided code: ${resetCode}`);

      if (!user.passwordResetCode) {
        console.error(`[RESET-PASSWORD] No reset code stored for Telegram ID: ${telegramId}`);
        return res.status(401).json({ error: 'No reset code found. Please request a new code.' });
      }

      if (user.passwordResetCode !== resetCode) {
        console.error(`[RESET-PASSWORD] Invalid reset code for Telegram ID: ${telegramId}. Expected: ${user.passwordResetCode}, Got: ${resetCode}`);
        return res.status(401).json({ error: 'Invalid reset code' });
      }

      if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
        console.error(`[RESET-PASSWORD] Reset code expired for Telegram ID: ${telegramId}. Expiry: ${user.passwordResetExpiry}, Now: ${new Date()}`);
        return res.status(401).json({ error: 'Reset code expired. Please request a new code.' });
      }

      console.log(`[RESET-PASSWORD] Reset code verified successfully for Telegram ID: ${telegramId}`);
    } else if (oldPassword) {
      console.log(`[RESET-PASSWORD] Verifying old password for Telegram ID: ${telegramId}`);

      if (!user.password) {
        console.error(`[RESET-PASSWORD] Password not set for Telegram ID: ${telegramId}`);
        return res.status(400).json({ error: 'Password not set. Please use reset code instead.' });
      }

      const isPasswordValid = await user.comparePassword(oldPassword);
      if (!isPasswordValid) {
        console.error(`[RESET-PASSWORD] Invalid old password for Telegram ID: ${telegramId}`);
        return res.status(401).json({ error: 'Invalid old password' });
      }

      console.log(`[RESET-PASSWORD] Old password verified successfully for Telegram ID: ${telegramId}`);
    }

    // Update password
    console.log(`[RESET-PASSWORD] Updating password for Telegram ID: ${telegramId}`);
    user.password = newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    console.log(`[RESET-PASSWORD] Password reset successfully for Telegram ID: ${telegramId}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('[RESET-PASSWORD] Unexpected error:', error);
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
