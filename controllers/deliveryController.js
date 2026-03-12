import asyncHandler from 'express-async-handler';
import axios from 'axios';

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// @desc    Check if delivery is available
// @route   POST /api/delivery/check
// @access  Public
export const checkDeliveryAvailability = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'Location coordinates required'
    });
  }

  // Restaurant fixed location from env
  const restaurantLat = parseFloat(process.env.RESTAURANT_LAT);
  const restaurantLng = parseFloat(process.env.RESTAURANT_LNG);
  const maxDistance = parseFloat(process.env.MAX_DELIVERY_KM) || 10;

  // Calculate distance
  const distance = calculateDistance(lat, lng, restaurantLat, restaurantLng);
  const isDeliverable = distance <= maxDistance;

  // Get area name (optional - reverse geocode)
  let area = 'your area';
  try {
    // You can use OpenStreetMap Nominatim API here
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    area = response.data.address?.suburb || 
           response.data.address?.city_district || 
           'your area';
  } catch (error) {
    console.error('Reverse geocode error:', error);
  }

  res.status(200).json({
    success: true,
    data: {
      isDeliverable,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      maxDistance,
      area,
      restaurantLocation: {
        lat: restaurantLat,
        lng: restaurantLng
      }
    }
  });
});