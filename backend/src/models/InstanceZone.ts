import mongoose, { Schema, Document } from 'mongoose';

export interface IInstanceZone extends Document {
  zoneId: string;
  name: string;
  bossName?: string;
  level?: number;
  description?: string;
}

const InstanceZoneSchema = new Schema<IInstanceZone>({
  zoneId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  bossName: String,
  level: Number,
  description: String,
});

export default mongoose.model<IInstanceZone>('InstanceZone', InstanceZoneSchema);

