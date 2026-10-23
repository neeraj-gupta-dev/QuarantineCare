import mongoose, { Schema, Document, Types } from 'mongoose';

export type PatientStatus =
  | 'ADMITTED'
  | 'READY_FOR_DISCHARGE'
  | 'DISCHARGED_CURED'
  | 'DECEASED';

export type Gender = 'M' | 'F' | 'Other';

export interface IPatient extends Document {
  name: string;
  age: number;
  gender: Gender;
  bedNumber: number | null;
  admittedAt: Date;
  status: PatientStatus;
  notes: string;
  dischargeRecommendedBy: Types.ObjectId | null;
  dischargeRecommendedAt: Date | null;
  dischargedAt: Date | null;
  deceasedAt: Date | null;
  deathCause: string | null;
}

const PatientSchema = new Schema<IPatient>(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, enum: ['M', 'F', 'Other'], required: true },
    bedNumber: { type: Number, min: 1, max: 74 },
    admittedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ADMITTED', 'READY_FOR_DISCHARGE', 'DISCHARGED_CURED', 'DECEASED'],
      default: 'ADMITTED',
    },
    notes: { type: String, default: '' },
    dischargeRecommendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dischargeRecommendedAt: { type: Date, default: null },
    dischargedAt: { type: Date, default: null },
    deceasedAt: { type: Date, default: null },
    deathCause: { type: String, default: null },
  },
  { timestamps: true }
);

// Only one patient per bed; sparse allows null bedNumber for discharged/deceased
PatientSchema.index({ bedNumber: 1 }, { unique: true, sparse: true });
PatientSchema.index({ status: 1 });

export default mongoose.model<IPatient>('Patient', PatientSchema);
