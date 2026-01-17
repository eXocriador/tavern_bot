import mongoose, { Schema, Document } from 'mongoose';

export interface IParty extends Document {
  creatorId: mongoose.Types.ObjectId;
  zoneId: mongoose.Types.ObjectId;
  readyTime: Date;
  invitedUserIds: mongoose.Types.ObjectId[];
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const PartySchema = new Schema<IParty>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: 'InstanceZone',
      required: true,
      index: true,
    },
    readyTime: {
      type: Date,
      required: true,
    },
    invitedUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding parties by zone and status
PartySchema.index({ zoneId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IParty>('Party', PartySchema);
