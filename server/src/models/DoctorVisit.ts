import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDoctorVisit extends Document {
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  visitedAt: Date;
  dayKey: string; // YYYY-MM-DD
  treatmentNotes: string;
  medication: string;
}

const DoctorVisitSchema = new Schema<IDoctorVisit>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitedAt: { type: Date, required: true },
    dayKey: { type: String, required: true },
    treatmentNotes: { type: String, default: '' },
    medication: { type: String, default: '' },
  },
  { timestamps: true }
);

// Only one doctor visit per patient per day
DoctorVisitSchema.index(
  { patient: 1, dayKey: 1 },
  { unique: true, name: 'unique_patient_day_visit' }
);

export default mongoose.model<IDoctorVisit>('DoctorVisit', DoctorVisitSchema);
