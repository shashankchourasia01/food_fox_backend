import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  const token = req.headers.authorization.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired. Please login again.');
    }
    throw new Error('Not authorized, token failed');
  }

  req.user = await User.findById(decoded.id).select('-otp');
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (!req.user.isLoggedIn || !req.user.currentToken || req.user.currentToken !== token) {
    res.status(401);
    throw new Error('Session expired. Please login again.');
  }

  next();
});

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as admin');
  }
};