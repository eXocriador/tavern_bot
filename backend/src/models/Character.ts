import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacter extends Document {
  userId: mongoose.Types.ObjectId;
  nickname: string;
  profession: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<ICharacter>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
    },
    profession: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user's characters
CharacterSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ICharacter>('Character', CharacterSchema);
