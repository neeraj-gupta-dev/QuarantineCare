import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  toRole: 'nurse' | 'doctor' | 'admin';
  patient: Types.ObjectId | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    toRole: {
      type: String,
      enum: ['nurse', 'doctor', 'admin'],
      required: true,
    },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', default: null },
    type: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ toRole: 1, read: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
