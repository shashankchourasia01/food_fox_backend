import mongoose from 'mongoose';

const cartSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  cartItems: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product'
      },
      name: String,
      price: Number,
      image: String,
      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
      },
      pieces: String
    }
  ],
  totalPrice: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;