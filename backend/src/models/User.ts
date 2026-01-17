import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  characterName?: string;
  characterLevel?: number;
  timezone?: string;
  language?: string;
  password?: string;
  passwordResetCode?: string;
  passwordResetExpiry?: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  username: String,
  firstName: String,
  lastName: String,
  characterName: String,
  characterLevel: Number,
  timezone: {
    type: String,
    default: 'UTC',
  },
  language: {
    type: String,
    default: 'ua',
  },
  password: {
    type: String,
    select: false, // Don't include password in queries by default
  },
  passwordResetCode: String,
  passwordResetExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);

