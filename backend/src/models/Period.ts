import mongoose, { Schema, Document } from 'mongoose';

export interface IPeriod extends Document {
  periodId: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

const PeriodSchema = new Schema<IPeriod>({
  periodId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model<IPeriod>('Period', PeriodSchema);

