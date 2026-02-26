import asyncHandler from 'express-async-handler';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'name price image stock');

  if (!cart) {
    // Create empty cart if not exists
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      totalPrice: 0,
      totalItems: 0
    });
  }

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Validate product
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Check stock
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available in stock`
    });
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: []
    });
  }

  // Check if item already exists
  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more than ${product.stock} items`
      });
    }

    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
      pieces: product.pieces
    });
  }

  await cart.save();

  // Populate product details
  await cart.populate('items.product', 'name price image stock');

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: cart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1'
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Item not found in cart'
    });
  }

  // Check stock
  const product = await Product.findById(productId);
  if (product && quantity > product.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available in stock`
    });
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();
  await cart.populate('items.product', 'name price image stock');

  res.status(200).json({
    success: true,
    message: 'Cart updated',
    data: cart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  cart.items = cart.items.filter(
    item => item.product.toString() !== productId
  );

  await cart.save();
  await cart.populate('items.product', 'name price image stock');

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: cart
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: cart
  });
});