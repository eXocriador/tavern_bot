import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  characterName?: string;
  characterLevel?: number;
  timezone?: string;
  language?: string;
  createdAt: Date;
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IUser>('User', UserSchema);

