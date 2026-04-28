const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'cpcr_portfolio',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return null;
  }
};

const Blog = require('./models/Blog');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cpcr_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Setup for Image Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const auth = require('./middleware/auth');

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user profile
app.get('/api/auth/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update current user profile
app.put('/api/auth/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password
app.put('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Blog Routes
app.get('/api/blogs', async (req, res) => {
// ...
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/blogs', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, category, date, content } = req.body;
    let imgUrl = req.body.img || '/work-1.png';
    
    if (req.file) {
      const cloudinaryUrl = await uploadToCloudinary(req.file.path);
      imgUrl = cloudinaryUrl || `/uploads/${req.file.filename}`;
    }

    const newBlog = new Blog({ title, excerpt, category, date, content, img: imgUrl });
    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/blogs/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, category, date, content } = req.body;
    const updateData = { title, excerpt, category, date, content };
    
    if (req.file) {
      const cloudinaryUrl = await uploadToCloudinary(req.file.path);
      updateData.img = cloudinaryUrl || `/uploads/${req.file.filename}`;
    } else if (req.body.img) {
      updateData.img = req.body.img;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedBlog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const Assignment = require('./models/Assignment');

// Assignment Routes
app.get('/api/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/assignments/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/assignments', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, location, category, client, date, description } = req.body;
    let imgUrl = req.body.img || '/work-1.png';
    
    if (req.file) {
      const cloudinaryUrl = await uploadToCloudinary(req.file.path);
      imgUrl = cloudinaryUrl || `/uploads/${req.file.filename}`;
    }
    
    const newAssignment = new Assignment({
      title, location, category, client, date, description, img: imgUrl
    });

    const savedAssignment = await newAssignment.save();
    res.status(201).json(savedAssignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/assignments/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, location, category, client, date, description } = req.body;
    const updateData = { title, location, category, client, date, description };
    
    if (req.file) {
      const cloudinaryUrl = await uploadToCloudinary(req.file.path);
      updateData.img = cloudinaryUrl || `/uploads/${req.file.filename}`;
    } else if (req.body.img) {
      updateData.img = req.body.img;
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedAssignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const Enquiry = require('./models/Enquiry');

// Enquiry Routes
app.post('/api/enquiries', async (req, res) => {
  try {
    const { name, phone, email, message } = req.body;
    const newEnquiry = new Enquiry({ name, phone, email, message });
    await newEnquiry.save();
    res.status(201).json({ message: 'Enquiry sent successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/enquiries', auth, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/enquiries/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const updatedEnquiry = await Enquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updatedEnquiry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/enquiries/:id', auth, async (req, res) => {
  try {
    await Enquiry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Enquiry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
