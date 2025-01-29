const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bodyParser = require('body-parser');
require("dotenv").config();
const cors=require('cors')
const app = express();
app.use(
  cors({
    origin: 'https://tradeoxi.com', // Allow requests only from localhost:3000
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    credentials: true, 
  })
);
const PORT = 3000;

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URL;
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the schema and model for storing image data
const ImageSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
});
const Image = mongoose.model('Image', ImageSchema);

// Define the schema and model for user feedback
const FeedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  phoneNumber: String,
  comment: String,    
});
const Feedback = mongoose.model('Feedback', FeedbackSchema);

// Admin schema for login (plain text password)
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Admin = mongoose.model('Admin', AdminSchema);
const createAdmin = async () => {
    const username = 'admin'; // Set your admin username
    const password = 'admin'; // Set your admin password (plain text)
  
    // Check if the admin user already exists in the database
    const existingAdmin = await Admin.findOne({ username });
  
    if (existingAdmin) {
      console.log('Admin already exists. Skipping creation.');
      return; // Exit the function if the admin already exists
    }
  
    // If no existing admin is found, create a new one
    const newAdmin = new Admin({
      username,
      password,
    });
  
    // Save the new admin to the database
    await newAdmin.save();
    console.log('Admin created successfully');
  };
  createAdmin()
  
  

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Configure Multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Optional: specify folder in Cloudinary
    format: async (req, file) => 'png', // Set file format (optional)
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
  },
});
const upload = multer({ storage });

// Middleware
app.use(bodyParser.json());

// Route for uploading image
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!req.file || !title || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Save data to MongoDB
    const image = new Image({
      title,
      description,
      imageUrl: req.file.path, // Cloudinary stores file path in `path`
    });
    await image.save();

    res.status(201).json({ message: 'Image uploaded successfully', image });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for getting uploaded images and data
app.get('/uploads', async (req, res) => {
  try {
    const images = await Image.find();
    res.status(200).json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for submitting feedback
app.post('/feedback', async (req, res) => {
  try {
    const { name, email, phoneNumber, comment } = req.body;
    if (!name || !email || !phoneNumber || !comment) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Save feedback to MongoDB
    const feedback = new Feedback({
      name,
      email,
      phoneNumber,
      comment,
    });
    await feedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for getting feedback data
app.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.status(200).json({ feedbacks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin login route (without encryption)
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    // Compare the provided password with the stored password
    if (admin.password !== password) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    res.status(200).json({ message: 'Login successful' });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
