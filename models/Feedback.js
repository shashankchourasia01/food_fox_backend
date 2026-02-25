import mongoose from 'mongoose';

const feedbackSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: [true, 'Please add name']
  },
  email: String,
  rating: {
    type: Number,
    required: [true, 'Please add rating'],
    min: 1,
    max: 5
  },
  category: {
    type: String,
    enum: ['general', 'food', 'delivery', 'app', 'suggestion', 'complaint'],
    default: 'general'
  },
  message: {
    type: String,
    required: [true, 'Please add feedback message']
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;