import mongoose from 'mongoose';

/**
 * Global platform settings — a single document (singleton).
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We are performing scheduled maintenance.' },
    announcement: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      level: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    },
    autoApproveOrchards: { type: Boolean, default: false },
    featuredLimit: { type: Number, default: 8 },
    supportEmail: { type: String, default: 'support@orchardlease.com' },
    commissionPercent: { type: Number, default: 10 },
    advancePaymentPercent: { type: Number, default: 30, min: 0, max: 100 },
    balanceDueDaysBeforeLease: { type: Number, default: 0, min: 0, max: 365 },
  },
  { timestamps: true }
);

settingSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
