import axios from 'axios';

class WhatsAppService {
  constructor() {
    this.adminNumber = '919229264244'; // Admin का WhatsApp number
  }

  /**
   * Send order notification via WhatsApp
   */
  async sendOrderNotification(order) {
    try {
      // ✅ Generate Google Maps link if coordinates available
      let mapsLink = '';
      if (order.shippingAddress?.lat && order.shippingAddress?.lng) {
        mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${order.shippingAddress.lat},${order.shippingAddress.lng}`;
      }

      // Prepare message
      const message = `🛑 *NEW ORDER ALERT!*\n\n` +
        `*Order ID:* #${order._id.slice(-8)}\n` +
        `*Customer:* ${order.shippingAddress.fullName}\n` +
        `*Phone:* ${order.shippingAddress.phone}\n` +
        `*Total:* ₹${order.totalPrice}\n` +
        `*Payment:* ${order.paymentMethod}\n` +
        `*Address:* ${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode}\n\n` +
        (mapsLink ? `📍 *Exact Location:* ${mapsLink}\n\n` : '') +
        `🔗 *View Order:* ${process.env.FRONTEND_URL || 'https://food-fox-five.vercel.app'}/admin/orders/${order._id}`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${this.adminNumber}?text=${encodedMessage}`;

      console.log('📲 WhatsApp URL generated:', whatsappUrl);
      
      // You can either:
      // Option 1: Return URL for frontend to open
      return { success: true, whatsappUrl };

      // Option 2: Actually send via API (if you have WhatsApp Business API)
      // const response = await axios.post('your-whatsapp-api-endpoint', {
      //   number: this.adminNumber,
      //   message: message
      // });
      
    } catch (error) {
      console.error('❌ WhatsApp notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new WhatsAppService();