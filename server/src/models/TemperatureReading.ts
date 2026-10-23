import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITemperatureReading extends Document {
  patient: Types.ObjectId;
  valueF: number;
  recordedBy: Types.ObjectId;
  recordedAt: Date;
  dayKey: string; // YYYY-MM-DD
  isCorrection: boolean;
  correctionReason: string | null;
}

const TemperatureReadingSchema = new Schema<ITemperatureReading>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    valueF: { type: Number, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedAt: { type: Date, required: true },
    dayKey: { type: String, required: true },
    isCorrection: { type: Boolean, default: false },
    correctionReason: { type: String, default: null },
  },
  { timestamps: true }
);

// Only one non-correction reading per patient per day.
// Corrections (isCorrection: true) bypass this constraint via partial filter.
TemperatureReadingSchema.index(
  { patient: 1, dayKey: 1 },
  {
    unique: true,
    partialFilterExpression: { isCorrection: false },
    name: 'unique_patient_day_non_correction',
  }
);

export default mongoose.model<ITemperatureReading>(
  'TemperatureReading',
  TemperatureReadingSchema
);
