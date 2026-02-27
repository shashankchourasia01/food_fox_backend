import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

// ============================================
// DASHBOARD
// ============================================
export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments();
  
  // Today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = await Order.countDocuments({
    createdAt: { $gte: today }
  });

  // Recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'name phone');

  res.json({
    success: true,
    data: {
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        todayOrders
      },
      recentOrders
    }
  });
});

// ============================================
// PRODUCT MANAGEMENT
// ============================================

// Get all products (admin view)
export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json({ success: true, data: products });
});

// Create product
export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// Update product
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({ success: true, data: updatedProduct });
});

// Delete product
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted successfully' });
});

// ============================================
// ORDER MANAGEMENT
// ============================================

// Get all orders
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name phone')
    .sort({ createdAt: -1 });
  
  res.json({ success: true, data: orders });
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.orderStatus = status;
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note: `Status updated to ${status} by admin`
  });

  await order.save();

  res.json({ success: true, data: order });
});

// Get single order details
export const getOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name phone email addresses')
    .populate('orderItems.product', 'name price image');
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({ success: true, data: order });
});

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-otp')
    .sort({ createdAt: -1 });
  
  res.json({ success: true, data: users });
});

// Update user role (make admin)
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = role;
  await user.save();

  res.json({ success: true, data: user });
});