import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import { User } from './models/User.js';

// 1. App aur Environment Setup
dotenv.config();
const app = express();

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      // 1. Password hash karein
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      
      await User.create({
        name: 'System Admin',
        email: process.env.ADMIN_EMAIL,
        passwordHash, 
        role: 'admin',
      });
      console.log('✅ Admin account seeded successfully');
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  }
};


// Connect DB then run Seeder
connectDB().then(() => {
  seedAdmin();
});

// 3. Middlewares (Security & Body Parser)
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// 4. API Routes
app.use('/api/v1/auth', authRoutes);

// 5. Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});