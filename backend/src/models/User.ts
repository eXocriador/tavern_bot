import bcrypt from 'bcryptjs';
import mongoose, { type Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
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
UserSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};
export default mongoose.model<IUser>('User', UserSchema);
