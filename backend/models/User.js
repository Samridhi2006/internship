import mongoose from "mongoose";
import bcrypt from "bcrypt";

const activeSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
    os: { type: String, default: "Unknown OS" },
    browser: { type: String, default: "Unknown Browser" },
    ipAddress: { type: String, required: true },
    location: {
      country: { type: String, default: "Unknown" },
      region: { type: String, default: "Unknown" },
      city: { type: String, default: "Unknown" },
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const securityLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    eventType: {
      type: String,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "ACCOUNT_LOCKOUT",
        "SUSPICIOUS_LOGIN",
        "PASSWORD_RESET_REQUEST",
        "PASSWORD_RESET_SUCCESS",
        "EMAIL_VERIFIED",
        "SESSION_REVOKED",
        "REGISTRATION",
        "INTERVIEW_STARTED",
        "INTERVIEW_PROGRESS",
        "INTERVIEW_COMPLETED",
        "INTERVIEW_EVALUATION",
      ],
      required: true,
    },
    ipAddress: { type: String, required: true },
    deviceDetails: {
      deviceType: { type: String, default: "unknown" },
      os: { type: String, default: "Unknown OS" },
      browser: { type: String, default: "Unknown Browser" },
      userAgent: { type: String, default: "" },
    },
    location: {
      country: { type: String, default: "Unknown" },
      region: { type: String, default: "Unknown" },
      city: { type: String, default: "Unknown" },
    },
    status: { type: String, enum: ["SUCCESS", "FAILED", "BLOCKED", "WARNING"], required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, minlength: [2, "Name must be at least 2 characters"], maxlength: [100, "Name cannot exceed 100 characters"] },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please provide a valid email address"], index: true },
    password: { type: String, required: [true, "Password is required"], minlength: [8, "Password must be at least 8 characters"], select: false },
    isVerified: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ["user", "student", "mentor", "admin"], default: "student" },
    verificationToken: { type: String, default: null, select: false },
    verificationTokenExpiry: { type: Date, default: null, select: false },
    resetPasswordToken: { type: String, default: null, select: false },
    resetPasswordTokenExpiry: { type: Date, default: null, select: false },
    loginAttempts: { type: Number, default: 0, min: 0 },
    lockoutUntil: { type: Date, default: null, index: true },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    activeSessions: { type: [activeSessionSchema], default: [] },
    securityLogs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    knownIpAddresses: { type: [String], default: [] },
    knownDeviceFingerprints: { type: [String], default: [] },
    xp: { type: Number, default: 0 },
    completedInterviews: { type: Number, default: 0 },
    leaderboardStanding: { type: Number, default: 1000 },
    passwordChangedAt: { type: Date, default: null },
    securitySettings: {
      maxActiveSessions: { type: Number, default: 1 },
      requireVerification: { type: Boolean, default: true },
      alertOnNewDevice: { type: Boolean, default: true },
      sessionTimeoutMinutes: { type: Number, default: 1440 },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("isLockedOut").get(function () { return this.lockoutUntil && this.lockoutUntil > new Date(); });
userSchema.virtual("activeSessionCount").get(function () { return this.activeSessions ? this.activeSessions.length : 0; });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (this.isNew === false) { this.passwordChangedAt = new Date(); }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) { return bcrypt.compare(candidatePassword, this.password); };
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) { this.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); }
  return this.save();
};
userSchema.methods.resetLoginAttempts = async function () { this.loginAttempts = 0; this.lockoutUntil = null; return this.save(); };
userSchema.methods.addSecurityLog = async function (logEntry) {
  this.securityLogs.push(logEntry);
  if (this.securityLogs.length > 500) { this.securityLogs = this.securityLogs.slice(-500); }
  return this.save();
};
userSchema.methods.addActiveSession = async function (sessionData) {
  const maxSessions = this.securitySettings.maxActiveSessions || 1;
  if (this.activeSessions.length >= maxSessions) { this.activeSessions = []; }
  this.activeSessions.push(sessionData);
  return this.save();
};
userSchema.methods.revokeSession = async function (sessionId) {
  this.activeSessions = this.activeSessions.filter((s) => s._id.toString() !== sessionId.toString());
  return this.save();
};
userSchema.methods.revokeAllSessions = async function () { this.activeSessions = []; return this.save(); };

userSchema.index({ "activeSessions.tokenHash": 1 });
userSchema.index({ "securityLogs.timestamp": -1 });
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
