#!/usr/bin/env node
/**
 * Setup .env from .env.example
 * Run: node scripts/setup-env.js
 */
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

if (existsSync(envPath)) {
  console.log('✅ .env already exists. No changes made.');
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error('❌ .env.example not found');
  process.exit(1);
}

copyFileSync(examplePath, envPath);
console.log('✅ Created .env from .env.example');
console.log('');
console.log('📝 Next steps:');
console.log('   1. Edit .env and add your SMTP credentials (for free Email OTP)');
console.log('   2. Add FAST2SMS_API_KEY (for SMS OTP)');
console.log('   3. For consistent sender: complete DLT registration (see DLT_SETUP_GUIDE.md)');
console.log('');
