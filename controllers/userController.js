import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Public (temporarily)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Create a user
// @route   POST /api/users
// @access  Public
const createUser = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ phone });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this phone number');
  }

  // Create user
  const user = await User.create({
    name,
    phone,
    email
  });

  res.status(201).json({
    success: true,
    data: user
  });
});

export { getUsers, createUser };