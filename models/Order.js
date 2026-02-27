import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderItems: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
      image: { type: String, required: true },
      pieces: String
    }
  ],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    landmark: String,
    city: { type: String, required: true, default: 'Bangalore' },
    pincode: { type: String, required: true },
    type: { type: String, default: 'home' }
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Razorpay', 'Stripe', 'Wallet'],
    default: 'COD',
    required: true
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0,
    min: 0
  },
  deliveryPrice: {
    type: Number,
    required: true,
    default: 40.0,
    min: 0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0,
    min: 0
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: Date,
  isDelivered: {
    type: Boolean,
    required: true,
    default: false
  },
  deliveredAt: Date,
  orderStatus: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'out-for-delivery',
      'delivered',
      'cancelled',
      'refunded'
    ],
    default: 'pending',
    required: true
  },
  statusHistory: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
      note: String,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ],
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  cancellationReason: String,
  notes: String,
  trackingId: String
}, {
  timestamps: true
});

// ✅ FIXED: Without next parameter
orderSchema.pre('save', function() {
  // Calculate total price
  this.itemsPrice = this.orderItems.reduce(
    (total, item) => total + (item.price * item.quantity), 0
  );
  this.totalPrice = this.itemsPrice + this.deliveryPrice + this.taxPrice;
  
  // Add to history if status changed
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      note: `Order ${this.orderStatus}`
    });
  }
});

// Add index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;