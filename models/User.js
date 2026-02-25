import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
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
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Encrypt password if using password (for admin)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;