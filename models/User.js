import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  // 🔐 New fields for OTP
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // User addresses
  addresses: [
    {
      type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
      },
      address: { type: String, required: true },
      landmark: String,
      lat: Number,
      lng: Number,
      isDefault: { type: Boolean, default: false }
    }
  ],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Compare OTP (method)
userSchema.methods.compareOTP = function(enteredOTP) {
  return this.otp && this.otp.code === enteredOTP;
};

// Check if OTP is expired
userSchema.methods.isOTPExpired = function() {
  return this.otp && this.otp.expiresAt < new Date();
};

const User = mongoose.model('User', userSchema);
export default User;