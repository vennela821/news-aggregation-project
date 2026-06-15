require('dotenv').config();

const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 8081;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-on-render';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, unique: true, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['READER', 'STUDENT', 'ADMIN'], default: 'READER' },
    blocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, required: true },
    summary: { type: String, trim: true },
    source: { type: String, trim: true, default: 'Student Desk' },
    category: { type: String, trim: true, default: 'General' },
    imageUrl: { type: String, trim: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, trim: true },
    authorEmail: { type: String, trim: true, lowercase: true },
    publishedDate: { type: Date },
  },
  { timestamps: true }
);

function toJsonWithId(_doc, ret) {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  return ret;
}

userSchema.set('toJSON', { transform: toJsonWithId });
articleSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt || ret.publishedDate;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
const Article = mongoose.model('Article', articleSchema);

function displayName(user) {
  return user.name || user.email;
}

function signToken(user) {
  return jwt.sign({ sub: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authResponse(message, user) {
  return {
    message,
    token: signToken(user),
    name: displayName(user),
    email: user.email,
    role: user.role,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) return res.status(401).json({ message: 'Login required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: payload.sub });
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.blocked) return res.status(403).json({ message: 'Your account is blocked. Contact admin.' });
    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'news-aggregation-project' });
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must have at least 6 characters' });

    const exists = await User.exists({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'READER',
    });

    res.status(201).json(authResponse('Registration successful', user));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const user = await User.findOne({ email });
    const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !validPassword) return res.status(400).json({ message: 'Invalid email or password' });
    if (user.blocked) return res.status(403).json({ message: 'Your account is blocked. Contact admin.' });

    res.json(authResponse('Login successful', user));
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ name: displayName(req.user), email: req.user.email, role: req.user.role });
});

app.get('/api/articles', async (req, res, next) => {
  try {
    const filter = { status: 'APPROVED' };
    const { category, source, query } = req.query;

    if (category && String(category).toLowerCase() !== 'all') filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (source) filter.source = new RegExp(`^${escapeRegex(source)}$`, 'i');
    if (query) {
      const search = new RegExp(escapeRegex(query), 'i');
      filter.$or = [{ title: search }, { content: search }, { category: search }, { source: search }];
    }

    const articles = await Article.find(filter).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    next(error);
  }
});

app.get('/api/articles/my-articles', authenticate, async (req, res, next) => {
  try {
    const articles = await Article.find({ authorId: req.user._id }).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    next(error);
  }
});

app.get('/api/articles/admin/pending', authenticate, requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const articles = await Article.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    next(error);
  }
});

app.post('/api/articles', authenticate, requireRole('STUDENT', 'ADMIN'), async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();

    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });

    const article = await Article.create({
      title,
      content,
      summary: req.body.summary || content.slice(0, 180),
      source: req.body.source || 'Student Desk',
      category: req.body.category || 'General',
      imageUrl: req.body.imageUrl || '',
      status: 'PENDING',
      authorId: req.user._id,
      authorName: displayName(req.user),
      authorEmail: req.user.email,
      publishedDate: new Date(),
    });

    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
});

app.get('/api/articles/:id', async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    if (article.status === 'APPROVED') return res.json(article);
    res.status(403).json({ message: 'Article is not published yet' });
  } catch (error) {
    next(error);
  }
});

app.put('/api/articles/:id/approve', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(req.params.id, { status: 'APPROVED' }, { new: true });
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article approved', id: article.id });
  } catch (error) {
    next(error);
  }
});

app.put('/api/articles/:id/reject', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(req.params.id, { status: 'REJECTED' }, { new: true });
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article rejected', id: article.id });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', authenticate, requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/users/:id/role', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const role = String(req.body.role || '').trim().toUpperCase();
    if (!['READER', 'STUDENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Role must be READER, STUDENT, or ADMIN' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Role updated', role: user.role });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/users/:id/block', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { blocked: Boolean(req.body.blocked) }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: user.blocked ? 'User blocked' : 'User unblocked' });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(FRONTEND_DIR));
app.get('/', (_req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.name === 'CastError' ? 400 : 500;
  res.status(status).json({ message: status === 500 ? 'Server error' : 'Invalid request' });
});

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return;

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      existing.role = 'ADMIN';
      await existing.save();
    }
    return;
  }

  await User.create({
    name: process.env.ADMIN_NAME || 'Admin',
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'ADMIN',
  });
  console.log(`Seeded admin account: ${email}`);
}

async function start() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI environment variable.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  await seedAdmin();
  app.listen(PORT, () => console.log(`News Aggregator running on port ${PORT}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
