import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import connectDB from './config/db.js';
import arenaRoutes from './routes/arenaRoutes.js';
import recruiterRoutes from './routes/recruiterRoutes.js';
import authRoutes from './routes/authRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import placementRoutes from './routes/placementRoutes.js';
import { login } from './controllers/authController.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { generateChallenges } from './services/groqService.js';
import { Challenge } from './models/Arena.js';
import User from './models/User.js';
import seedArena from './config/seedArena.js';

const app = express();
const PORT = 4000;

// Connect to MongoDB Database
try {
  connectDB().then(async () => {
    try {
      await seedArena();
      // Ensure all existing users are marked as verified for seamless login
      await User.updateMany({}, { $set: { isVerified: true } });
      console.log("✅ Auto-verified all registered users in MongoDB.");
      console.log("[SERVER] Connection pipeline synchronized successfully");
    } catch (seedErr) {
      console.error("❌ Database seeding or verification failed:", seedErr);
    }
  }).catch((err) => {
    console.error("❌ connectDB promise failed to resolve:", err);
  });
} catch (connectErr) {
  console.error("❌ Exception thrown during database connection initialization:", connectErr);
}

// Middleware
app.use(cors());
app.use(express.json());

// Mount core router passing traffic through /api
const coreRouter = express.Router();
coreRouter.post('/auth/login', login); // Expose explicit public route handler
coreRouter.use('/auth', authRoutes);
coreRouter.use('/security', securityRoutes);
coreRouter.use('/arena', arenaRoutes);
coreRouter.use('/recruiter', recruiterRoutes);
coreRouter.use('/interview', interviewRoutes);
coreRouter.use('/admin', adminRoutes);
coreRouter.use('/placement', placementRoutes);
coreRouter.use('/readiness', placementRoutes);

app.use('/api', coreRouter);

// Cron Job: Generate challenges via Groq at 00:05 daily ('5 0 * * *')
cron.schedule('5 0 * * *', async () => {
  console.log('⏰ Cron Job triggered: Refreshing Arena challenges...');
  try {
    const categories = ['Technical', 'Domain', 'Aptitude', 'HR'];
    for (const cat of categories) {
      const generated = await generateChallenges(cat);
      if (generated && generated.length > 0) {
        await Challenge.insertMany(generated);
        console.log(`✅ Seeded challenges for category: ${cat}`);
      }
    }
  } catch (error) {
    console.error('❌ Error executing challenge refresh cron:', error);
  }
});

// Cron Job: Weekly challenge refresh on Monday at 00:10 ('10 0 * * 1')
cron.schedule('10 0 * * 1', async () => {
  console.log('⏰ Weekly Monday Cron Job triggered: Refreshing Arena challenges...');
  try {
    const categories = ['Technical', 'Domain', 'Aptitude', 'HR'];
    for (const cat of categories) {
      const generated = await generateChallenges(cat);
      if (generated && generated.length > 0) {
        await Challenge.insertMany(generated);
        console.log(`✅ Weekly monday refresh completed for category: ${cat}`);
      }
    }
  } catch (error) {
    console.error('❌ Error executing weekly challenge refresh cron:', error);
  }
});

// Root Healthcheck
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Milestone Arena API Engine',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Error boundaries
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Arena API Server running on port http://localhost:${PORT}`);
  console.log(`📡 Mount point active at /api/arena`);
});
