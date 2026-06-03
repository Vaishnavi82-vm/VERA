import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dns from 'dns';

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const FRONTEND_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000').split(',');

if (MONGO_URI?.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('Using Google DNS for MongoDB SRV resolution');
}

if (!MONGO_URI) {
  console.error('MONGODB_URI is required. Set it in .env or environment variables.');
  process.exit(1);
}

const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const wardrobeSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  image_url: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
  created_at: { type: Date, default: () => new Date() },
  ai_analyzed: { type: Boolean, default: false },
  ai_description: { type: String, default: '' },
  worn_count: { type: Number, default: 0 },
  occasions: { type: [String], default: [] },
  style: { type: String, default: '' },
  primary_color: { type: String, default: '' },
  aesthetic: { type: String, default: '' },
});

const WardrobeItem = mongoose.model('WardrobeItem', wardrobeSchema);

const app = express();
app.use(cors({ origin: FRONTEND_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '')}`;
    cb(null, safeName);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.get('/api/wardrobe', async (req, res) => {
  try {
    const items = await WardrobeItem.find().sort({ createdAt: -1 }).lean();
    res.json(items.map((item) => ({
      ...item,
      id: item._id,
      createdAt: item.createdAt,
      created_at: item.created_at,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch wardrobe items' });
  }
});

app.post('/api/wardrobe', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const title = req.body.title || req.file.originalname || 'Untitled';
    const name = title;
    const category = req.body.category || 'uncategorized';
    const description = req.body.description || '';
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const createdAt = new Date();

    const item = await WardrobeItem.create({
      title,
      name,
      description,
      category,
      imageUrl,
      image_url: imageUrl,
      createdAt,
      created_at: createdAt,
    });

    res.status(201).json({
      ...item.toObject(),
      id: item._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload wardrobe item' });
  }
});

app.delete('/api/wardrobe/:id', async (req, res) => {
  try {
    const item = await WardrobeItem.findByIdAndDelete(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete wardrobe item' });
  }
});

app.patch('/api/wardrobe/:id/worn', async (req, res) => {
  try {
    const item = await WardrobeItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.worn_count += 1;
    await item.save();
    res.json({ success: true, worn_count: item.worn_count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to mark item worn' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
