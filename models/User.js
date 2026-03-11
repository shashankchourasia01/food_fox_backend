//for fast2sm
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
  // 🔐 Updated fields for OTP (supports local, twilio, and fast2sms)
  otp: {
    code: String,           // For local OTP and Fast2SMS
    requestId: String,      // For Twilio Verify
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
    provider: { 
      type: String, 
      enum: ['local', 'twilio', 'fast2sms'],   // 👈 'fast2sms' add किया
      default: 'local'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
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
  }
}, {
  timestamps: true
});

// Compare OTP (method) - works for local and fast2sms
userSchema.methods.compareOTP = function(enteredOTP) {
  return this.otp && this.otp.code === enteredOTP;
};

// Check if OTP is expired
userSchema.methods.isOTPExpired = function() {
  return this.otp && this.otp.expiresAt < new Date();
};

const User = mongoose.model('User', userSchema);
export default User;






// for twilio

// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// const userSchema = mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, 'Please add a name'],
//     trim: true
//   },
//   phone: {
//     type: String,
//     required: [true, 'Please add phone number'],
//     unique: true,
//     match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
//   },
//   email: {
//     type: String,
//     match: [
//       /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
//       'Please add a valid email'
//     ]
//   },
//   // 🔐 Updated fields for OTP (supports both local and Twilio)
//   otp: {
//     code: String,           // For local OTP
//     requestId: String,      // For Twilio Verify
//     expiresAt: Date,
//     attempts: { type: Number, default: 0 },
//     provider: { 
//       type: String, 
//       enum: ['local', 'twilio'],   // 👈 'twilio' use करो 'vonage-verify' nahी
//       default: 'local'
//     }
//   },
//   isVerified: {
//     type: Boolean,
//     default: false
//   },
//   lastLogin: Date,
//   // User addresses
//   addresses: [
//     {
//       type: {
//         type: String,
//         enum: ['home', 'work', 'other'],
//         default: 'home'
//       },
//       address: { type: String, required: true },
//       landmark: String,
//       lat: Number,
//       lng: Number,
//       isDefault: { type: Boolean, default: false }
//     }
//   ],
//   role: {
//     type: String,
//     enum: ['user', 'admin'],
//     default: 'user'
//   }
// }, {
//   timestamps: true
// });

// // Compare OTP (method) - works for local OTP only
// userSchema.methods.compareOTP = function(enteredOTP) {
//   return this.otp && this.otp.code === enteredOTP;
// };

// // Check if OTP is expired
// userSchema.methods.isOTPExpired = function() {
//   return this.otp && this.otp.expiresAt < new Date();
// };

// const User = mongoose.model('User', userSchema);
// export default User;


