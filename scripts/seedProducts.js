import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import { sampleProducts } from '../utils/sampleProducts.js';

dotenv.config();

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Clear existing products
    await Product.deleteMany();
    console.log('🗑️ Existing products cleared');

    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ ${products.length} products inserted`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedProducts();