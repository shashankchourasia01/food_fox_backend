import mongoose from 'mongoose';

const productSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add product name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add description']
  },
  price: {
    type: Number,
    required: [true, 'Please add price'],
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: [true, 'Please add category'],
    enum: ['Special Thali', 'Deluxe Thali', 'Classic Thali', 'Comfort Thali', 
           'Standard Thali', 'Jain Thali', 'Rice Combo', 'Healthy', 'Breakfast']
  },
  type: {
    type: String,
    enum: ['special', 'deluxe', 'classic', 'comfort', 'standard', 'jain', 'rice', 'healthy', 'breakfast']
  },
  image: {
    type: String,
    required: [true, 'Please add image URL']
  },
  pieces: String,
  time: String,
  stock: {
    type: Number,
    default: 20,
    min: 0
  },
  isHot: {
    type: Boolean,
    default: false
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, type: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;