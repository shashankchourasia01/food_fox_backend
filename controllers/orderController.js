import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import whatsappService from '../services/whatsappService.js';

// // @desc    Create new order
// // @route   POST /api/orders
// // @access  Private
// export const createOrder = asyncHandler(async (req, res) => {
//   const {
//     shippingAddress,
//     paymentMethod = 'COD',
//     notes
//   } = req.body;

//   // Get user's cart
//   const cart = await Cart.findOne({ user: req.user._id })
//     .populate('items.product', 'name price image stock');

//   if (!cart || cart.items.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: 'Cart is empty'
//     });
//   }

//   // Check stock for all items
//   for (const item of cart.items) {
//     const product = await Product.findById(item.product._id);
//     if (product.stock < item.quantity) {
//       return res.status(400).json({
//         success: false,
//         message: `${product.name} has only ${product.stock} items in stock`
//       });
//     }
//   }

//   // Calculate delivery charge
//   const itemsPrice = cart.totalPrice;
//   const deliveryPrice = itemsPrice > 500 ? 0 : 40;

//   // Create order items
//   const orderItems = cart.items.map(item => ({
//     product: item.product._id,
//     name: item.name,
//     quantity: item.quantity,
//     price: item.price,
//     image: item.image,
//     pieces: item.pieces
//   }));

//   // Create order
//   const order = await Order.create({
//     user: req.user._id,
//     orderItems,
//     shippingAddress: {
//       ...shippingAddress,
//       fullName: req.user.name,
//       phone: req.user.phone
//     },
//     paymentMethod,
//     itemsPrice,
//     deliveryPrice,
//     totalPrice: itemsPrice + deliveryPrice,
//     notes,
//     orderStatus: 'pending',
//     statusHistory: [{
//       status: 'pending',
//       timestamp: new Date(),
//       note: 'Order placed successfully'
//     }],
//     estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000)
//   });

//   // Update product stock
//   for (const item of cart.items) {
//     await Product.findByIdAndUpdate(item.product._id, {
//       $inc: { stock: -item.quantity }
//     });
//   }

//   // Clear cart
//   cart.items = [];
//   await cart.save();

//   // ✅ FIX: Convert ObjectId to String properly
//   const orderIdString = order._id.toString(); // पहले string बनाओ
//   const shortOrderId = orderIdString.slice(-8); // फिर slice करो

//   // ✅ WhatsApp URL generate करो
//   const adminNumber = '919229264244'; // Format: Country code + number (without +)
//   const message = `🛑 *NEW ORDER ALERT!*\n\n` +
//     `*Order ID:* #${shortOrderId}\n` +
//     `*Customer:* ${req.user.name}\n` +
//     `*Phone:* ${req.user.phone}\n` +
//     `*Total:* ₹${order.totalPrice}\n` +
//     `*Payment:* ${order.paymentMethod}\n` +
//     `*Address:* ${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode}\n\n` +
//     `🔗 *View Order:* ${process.env.FRONTEND_URL || 'https://food-fox-five.vercel.app'}/admin/orders/${orderIdString}`; // यहाँ पूरा ID भेजो

//   const encodedMessage = encodeURIComponent(message);
//   const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodedMessage}`;

//   console.log('📲 WhatsApp notification URL generated:', whatsappUrl);

//   // ✅ Send response with order data (convert _id to string)
//   res.status(201).json({
//     success: true,
//     message: 'Order placed successfully',
//     data: {
//       ...order.toObject(),
//       _id: order._id.toString() // Frontend के लिए string ID
//     },
//     whatsappUrl: whatsappUrl
//   });
// });


// for new location code
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const {
    shippingAddress,
    paymentMethod = 'COD',
    notes
  } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'name price image stock');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cart is empty'
    });
  }

  // Check stock for all items
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (product.stock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `${product.name} has only ${product.stock} items in stock`
      });
    }
  }

  // Calculate delivery charge
  const itemsPrice = cart.totalPrice;
  const deliveryPrice = itemsPrice > 500 ? 0 : 30;

  // Create order items
  const orderItems = cart.items.map(item => ({
    product: item.product._id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    image: item.image,
    pieces: item.pieces
  }));

  // Create order
  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress: {
      ...shippingAddress,
      fullName: req.user.name,
      phone: req.user.phone
    },
    paymentMethod,
    itemsPrice,
    deliveryPrice,
    totalPrice: itemsPrice + deliveryPrice,
    notes,
    orderStatus: 'pending',
    statusHistory: [{
      status: 'pending',
      timestamp: new Date(),
      note: 'Order placed successfully'
    }],
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000)
  });

  // Update product stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stock: -item.quantity }
    });
  }

  // Clear cart
  cart.items = [];
  await cart.save();

  // ✅ FIX: Convert ObjectId to String properly
  const orderIdString = order._id.toString();
  const shortOrderId = orderIdString.slice(-8);

  // ✅ STEP 6: GOOGLE MAPS LINK GENERATE KARO
  let mapsLink = null;
  if (shippingAddress.lat && shippingAddress.lng) {
    mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${shippingAddress.lat},${shippingAddress.lng}`;
  }

  // ✅ WhatsApp URL generate करो (with maps link)
  const adminNumber = '919229264244';
  const message = `🛑 *NEW ORDER ALERT!*\n\n` +
    `*Order ID:* #${shortOrderId}\n` +
    `*Customer:* ${req.user.name}\n` +
    `*Phone:* ${req.user.phone}\n` +
    `*Total:* ₹${order.totalPrice}\n` +
    `*Payment:* ${order.paymentMethod}\n` +
    `*Address:* ${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode}\n` +
    (mapsLink ? `📍 *Live Location:* ${mapsLink}\n` : '') +
    `\n🔗 *View Order:* ${process.env.FRONTEND_URL || 'https://food-fox-five.vercel.app'}/admin/orders/${orderIdString}`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodedMessage}`;

  console.log('📲 WhatsApp notification URL generated:', whatsappUrl);

  // ✅ Prepare response with maps link
  const orderResponse = {
    ...order.toObject(),
    _id: order._id.toString(),
    mapsLink: mapsLink,
    whatsappUrl: whatsappUrl  // 👈 WhatsApp URL bhi response mein bhejo
  };

  // ✅ Send WhatsApp notification (non-blocking)
  // Ye frontend par already open ho jayega
  console.log('✅ Order created successfully');

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: orderResponse,
    whatsappUrl: whatsappUrl
  });
});



// @desc    Get all orders for logged in user
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name phone email');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check if user is authorized to view this order
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this order'
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check if user owns this order
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this order'
    });
  }

  // Check if order can be cancelled
  const cancellableStatuses = ['pending', 'confirmed'];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    return res.status(400).json({
      success: false,
      message: `Order cannot be cancelled in ${order.orderStatus} status`
    });
  }

  // Restore product stock
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity }
    });
  }

  order.orderStatus = 'cancelled';
  order.cancellationReason = reason;
  order.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: reason || 'Cancelled by user'
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: order
  });
});

// @desc    Track order
// @route   GET /api/orders/:id/track
// @access  Private
export const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .select('orderStatus statusHistory estimatedDeliveryTime trackingId');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: order.orderStatus,
      history: order.statusHistory,
      estimatedDelivery: order.estimatedDeliveryTime,
      trackingId: order.trackingId
    }
  });
});