import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { ROLES, ACCOUNT_STATUS } from '../utils/constants.js';

const notificationSettingsSchema = new mongoose.Schema(
  {
    emailBookings: { type: Boolean, default: true },
    emailApprovals: { type: Boolean, default: true },
    emailMarketing: { type: Boolean, default: false },
    inAppBookings: { type: Boolean, default: true },
    inAppSystem: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: {
      type: String,
      enum: [ROLES.SELLER, ROLES.RENTER],
      default: ROLES.RENTER,
      index: true,
    },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    phone: { type: String, default: '', trim: true },
    language: { type: String, default: 'en' },

    isBlocked: { type: Boolean, default: false, index: true },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false },

    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },

    // security / session
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    passwordChangedAt: { type: Date },

    // soft delete
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('isLocked').get(function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) this.passwordChangedAt = new Date();
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (typeof this.password !== 'string' || !this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.registerFailedLogin = async function registerFailedLogin() {
  // reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= config.security.maxLoginAttempts) {
      this.lockUntil = new Date(Date.now() + config.security.accountLockTimeMs);
    }
  }
  await this.save();
};

userSchema.methods.resetLoginAttempts = async function resetLoginAttempts() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  await this.save();
};

userSchema.methods.passwordChangedAfter = function passwordChangedAfter(jwtIat) {
  if (!this.passwordChangedAt) return false;
  return jwtIat * 1000 < this.passwordChangedAt.getTime();
};

const User = mongoose.model('User', userSchema);
export default User;
