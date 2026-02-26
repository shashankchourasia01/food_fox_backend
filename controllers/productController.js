import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const { 
    category, 
    type, 
    search, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build filter query
  let query = {};

  // Filter by category
  if (category && category !== 'All') {
    query.category = category;
  }

  // Filter by type
  if (type) {
    query.type = type;
  }

  // Search by name/description
  if (search) {
    query.$text = { $search: search };
  }

  // Only show in-stock items
  query.stock = { $gt: 0 };

  // Pagination
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;

  // Sorting
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortOptions = { [sortBy]: sortOrder };

  // Execute query
  const products = await Product.find(query)
    .sort(sortOptions)
    .limit(pageSize)
    .skip(skip);

  // Get total count for pagination
  const totalProducts = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    count: products.length,
    total: totalProducts,
    page: pageNumber,
    pages: Math.ceil(totalProducts / pageSize),
    data: products
  });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Get all categories
// @route   GET /api/products/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category');
  
  res.status(200).json({
    success: true,
    data: categories
  });
});

// @desc    Get featured products (bestsellers/hot)
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const featured = await Product.find({
    $or: [
      { isBestseller: true },
      { isHot: true }
    ],
    stock: { $gt: 0 }
  }).limit(10);

  res.status(200).json({
    success: true,
    data: featured
  });
});

// @desc    Create product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: updatedProduct
  });
});

// @desc    Delete product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});