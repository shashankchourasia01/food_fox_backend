import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.status(200).json({
    success: true,
    data: user.addresses || []
  });
});

// Validate coordinates (lat: -90 to 90, lng: -180 to 180)
const isValidCoord = (val) => val != null && !isNaN(val) && val >= -90 && val <= 90;
const isValidLng = (val) => val != null && !isNaN(val) && val >= -180 && val <= 180;

// @desc    Add new address
// @route   POST /api/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req, res) => {
  const { type, address, landmark, city, pincode, isDefault, lat, lng } = req.body;

  const user = await User.findById(req.user._id);

  // Create new address object (include lat/lng if valid)
  const newAddress = {
    type,
    address,
    landmark,
    city,
    pincode,
    isDefault: isDefault || false
  };
  if (isValidCoord(lat) && isValidLng(lng)) {
    newAddress.lat = parseFloat(lat);
    newAddress.lng = parseFloat(lng);
  }

  // If this is default address, remove default from others
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  // Add new address
  user.addresses.push(newAddress);
  await user.save();

  // Get the newly added address (last one)
  const addedAddress = user.addresses[user.addresses.length - 1];

  res.status(201).json({
    success: true,
    data: addedAddress
  });
});

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, address, landmark, city, pincode, isDefault, lat, lng } = req.body;

  const user = await User.findById(req.user._id);

  // Find address index
  const addressIndex = user.addresses.findIndex(
    addr => addr._id.toString() === id
  );

  if (addressIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  // If this is default address, remove default from others
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  // Update address (include lat/lng if valid)
  user.addresses[addressIndex].type = type;
  user.addresses[addressIndex].address = address;
  user.addresses[addressIndex].landmark = landmark;
  user.addresses[addressIndex].city = city;
  user.addresses[addressIndex].pincode = pincode;
  user.addresses[addressIndex].isDefault = isDefault || false;
  if (isValidCoord(lat) && isValidLng(lng)) {
    user.addresses[addressIndex].lat = parseFloat(lat);
    user.addresses[addressIndex].lng = parseFloat(lng);
  } else {
    user.addresses[addressIndex].lat = undefined;
    user.addresses[addressIndex].lng = undefined;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: user.addresses[addressIndex]
  });
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(req.user._id);

  // Filter out the address to delete
  user.addresses = user.addresses.filter(
    addr => addr._id.toString() !== id
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully'
  });
});

// @desc    Set default address
// @route   PUT /api/users/addresses/:id/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(req.user._id);

  // Remove default from all addresses
  user.addresses.forEach(addr => {
    addr.isDefault = false;
  });

  // Set selected address as default
  const addressIndex = user.addresses.findIndex(
    addr => addr._id.toString() === id
  );

  if (addressIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  user.addresses[addressIndex].isDefault = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Default address updated'
  });
});