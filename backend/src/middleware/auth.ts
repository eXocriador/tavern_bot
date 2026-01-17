import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User';

interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface AuthRequest extends express.Request {
  user?: {
    telegramId: number;
    _id: string;
  };
}

export const verifyTelegramAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authData = req.body as TelegramAuthData;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Verify hash
    const { hash, ...data } = authData;
    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key as keyof typeof data]}`)
      .join('\n');

    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return res.status(401).json({ error: 'Invalid authentication data' });
    }

    // Check auth_date (should be within 5 minutes)
    const authDate = authData.auth_date * 1000;
    const now = Date.now();
    if (now - authDate > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Authentication expired' });
    }

    // Find or create user
    let user = await User.findOne({ telegramId: authData.id });
    if (!user) {
      user = await User.create({
        telegramId: authData.id,
        username: authData.username,
        firstName: authData.first_name,
        lastName: authData.last_name,
      });
    } else {
      // Update user info
      user.username = authData.username;
      user.firstName = authData.first_name;
      user.lastName = authData.last_name;
      await user.save();
    }

    req.user = {
      telegramId: user.telegramId,
      _id: user._id.toString(),
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Web auth middleware - reads telegramId from header (works in all environments)
// This is used for web app requests after user has logged in via Telegram Web App
export const webAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Skip if user is already authenticated
  if (req.user) {
    return next();
  }

  const telegramId = req.headers['x-telegram-id'] || req.query.telegramId;
  if (telegramId) {
    try {
      const user = await User.findOne({ telegramId: Number(telegramId) });
      if (user) {
        req.user = {
          telegramId: user.telegramId,
          _id: user._id.toString(),
        };
      }
    } catch (error) {
      console.error('Web auth error:', error);
      // Continue without authentication - requireAuth will catch it if needed
    }
  }
  next();
};

// Dev mode middleware - reads telegramId from header (only in development)
// Kept for backward compatibility
export const devAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // In production, just call webAuth
  if (process.env.NODE_ENV === 'production') {
    return webAuth(req, res, next);
  }

  // In development, use webAuth logic
  return webAuth(req, res, next);
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

