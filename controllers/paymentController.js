import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay order
// @route   POST /api/payment/create-order
// @access  Private
export const createRazorpayOrder = asyncHandler(async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body;

    // Validate amount
    if (!amount || amount < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid amount'
        });
    }

    try {
        // Razorpay options (amount in paise)
        const options = {
            amount: amount * 100, // Convert ₹ to paise
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
            notes: {
                userId: req.user._id.toString()
            }
        };

        // Create order in Razorpay [citation:8]
        const order = await razorpay.orders.create(options);

        console.log('✅ Razorpay order created:', order.id);

        res.status(200).json({
            success: true,
            data: {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            },
            keyId: process.env.RAZORPAY_KEY_ID // Send public key to frontend
        });

    } catch (error) {
        console.error('❌ Razorpay order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order'
        });
    }
});

// @desc    Verify payment signature [citation:3]
// @route   POST /api/payment/verify
// @access  Private
export const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderData // Your order data from checkout
    } = req.body;

    // Create signature hash [citation:8]
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        // Payment verified - create actual order in database
        try {
            const order = await Order.create({
                user: req.user._id,
                orderItems: orderData.items,
                shippingAddress: orderData.shippingAddress,
                paymentMethod: 'Razorpay',
                paymentResult: {
                    id: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    signature: razorpay_signature,
                    status: 'completed',
                    update_time: new Date().toISOString()
                },
                itemsPrice: orderData.itemsPrice,
                deliveryPrice: orderData.deliveryPrice,
                totalPrice: orderData.totalPrice,
                orderStatus: 'confirmed',
                statusHistory: [{
                    status: 'confirmed',
                    timestamp: new Date(),
                    note: 'Payment successful via Razorpay'
                }]
            });

            // Clear cart (you already have this in createOrder)
            // You can also call the clearCart function here if needed

            res.status(200).json({
                success: true,
                message: 'Payment verified and order placed',
                orderId: order._id
            });

        } catch (error) {
            console.error('❌ Order creation error:', error);
            res.status(500).json({
                success: true,
                message: 'Payment verified but order creation failed',
                paymentId: razorpay_payment_id
            });
        }
    } else {
        // Payment verification failed [citation:6]
        res.status(400).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
});

// @desc    Webhook for payment events (server-side) [citation:6]
// @route   POST /api/payment/webhook
// @access  Public (with signature verification)
export const paymentWebhook = asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== req.headers['x-razorpay-signature']) {
        return res.status(400).json({ status: 'invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment?.entity;

    console.log(`📨 Razorpay webhook event: ${event}`);

    // Handle different events [citation:6]
    switch (event) {
        case 'payment.captured':
            // Payment successful - update order if needed
            console.log('✅ Payment captured:', payload.id);
            // You can update order status here
            break;
            
        case 'payment.failed':
            console.log('❌ Payment failed:', payload.id);
            // Log failed payment
            break;
            
        default:
            console.log('ℹ️ Unhandled event:', event);
    }

    res.json({ status: 'ok' });
});