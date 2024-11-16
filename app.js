// Import required libraries
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Initialize dotenv for loading environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json()); // For parsing JSON data in requests

// MongoDB URI from the .env file
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ktchandru1234:k.t.chandru1234@cluster0.afircsf.mongodb.net/task';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected to "task" database'))
  .catch((err) => console.log('MongoDB connection error: ', err));

// JWT Secret key from .env
const JWT_SECRET = process.env.JWT_SECRET || 'hdjjsjnebnmdmsjnend276373748589ndbvdbvh';

// MongoDB User Model
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

// MongoDB Admin Model
const Admin = mongoose.model('Admin', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

// MongoDB Assignment Model
const Assignment = mongoose.model('Assignment', new mongoose.Schema({
  userId: { type: String, required: true },
  task: { type: String, required: true },
  admin: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Rejected'] },
  dateTime: { type: Date, default: Date.now }
}));

// Middleware to check JWT authentication for User or Admin
const authenticateJWT = (role) => {
  return async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'Access denied' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (role === 'user') {
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: 'User not found' });
      } else if (role === 'admin') {
        const admin = await Admin.findById(decoded.id);
        if (!admin) return res.status(401).json({ message: 'Admin not found' });
      }

      next();
    } catch (err) {
      return res.status(400).json({ message: 'Invalid token' });
    }
  };
};

// User Registration Endpoint
app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error registering user' });
  }
});

// User Login Endpoint (Generate JWT)
app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ message: 'Login error' });
  }
});

// Admin Registration Endpoint
app.post('/api/admins/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error registering admin' });
  }
});

// Admin Login Endpoint (Generate JWT)
app.post('/api/admins/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ message: 'Login error' });
  }
});

// User Upload Assignment Endpoint
app.post('/api/assignments/upload', authenticateJWT('user'), async (req, res) => {
  const { task, admin } = req.body;
  const userId = req.user.id;

  try {
    const assignment = new Assignment({ userId, task, admin });
    await assignment.save();
    res.status(201).json({ message: 'Assignment uploaded successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error uploading assignment' });
  }
});

// Admin View Assignments Endpoint
app.get('/api/assignments', authenticateJWT('admin'), async (req, res) => {
  const adminId = req.user.id;

  try {
    const assignments = await Assignment.find({ admin: adminId });
    res.status(200).json(assignments);
  } catch (err) {
    res.status(400).json({ message: 'Error fetching assignments' });
  }
});
      

// Admin Accept Assignment Endpoint
app.post('/api/assignments/:id/accept', authenticateJWT('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    assignment.status = 'Accepted';
    await assignment.save();
    res.status(200).json({ message: 'Assignment accepted' });
  } catch (err) {
    res.status(400).json({ message: 'Error accepting assignment' });
  }
});

// Admin Reject Assignment Endpoint
app.post('/api/assignments/:id/reject', authenticateJWT('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    assignment.status = 'Rejected';
    await assignment.save();
    res.status(200).json({ message: 'Assignment rejected' });
  } catch (err) {
    res.status(400).json({ message: 'Error rejecting assignment' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
