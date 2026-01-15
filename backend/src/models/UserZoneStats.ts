import mongoose, { Schema, Document } from 'mongoose';

export interface IUserZoneStats extends Document {
  userId: mongoose.Types.ObjectId;
  zoneId: mongoose.Types.ObjectId;
  totalVisits: number;
  lastVisited?: Date;
}

const UserZoneStatsSchema = new Schema<IUserZoneStats>({
  userId: {
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
  totalVisits: {
    type: Number,
    default: 0,
  },
  lastVisited: Date,
});

// Compound index for unique user-zone stats
UserZoneStatsSchema.index({ userId: 1, zoneId: 1 }, { unique: true });

export default mongoose.model<IUserZoneStats>('UserZoneStats', UserZoneStatsSchema);

