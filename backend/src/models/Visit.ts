import mongoose, { Schema, Document } from 'mongoose';

export interface IVisit extends Document {
  userId: mongoose.Types.ObjectId;
  zoneId: mongoose.Types.ObjectId;
  visitedAt: Date;
  periodId: string;
}

const VisitSchema = new Schema<IVisit>({
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
  visitedAt: {
    type: Date,
    default: Date.now,
  },
  periodId: {
    type: String,
    required: true,
    index: true,
  },
});

// Compound index for unique visit per user-zone-period
VisitSchema.index({ userId: 1, zoneId: 1, periodId: 1 }, { unique: true });

export default mongoose.model<IVisit>('Visit', VisitSchema);

