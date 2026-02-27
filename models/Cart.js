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

// ✅ SIMPLE VERSION - Without next parameter
cartSchema.pre('save', function() {
  // Calculate total items
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0); 
  
  // Calculate total price
  this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;