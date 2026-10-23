import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: unknown;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

SettingSchema.index({ key: 1 }, { unique: true });

export default mongoose.model<ISetting>('Setting', SettingSchema);
