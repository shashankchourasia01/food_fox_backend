import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
      },
      image: {
        type: String,
        required: true
      },
      pieces: String
    }
  ],
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalItems: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// ✅ FIXED: Use regular function, NOT arrow function
cartSchema.pre('save', function(next) {
  try {
    // Calculate totals
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    next();
  } catch (error) {
    next(error);
  }
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;