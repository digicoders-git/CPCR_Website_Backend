const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@cpcr.in';
    const existingUser = await User.findOne({ email: adminEmail });

    if (existingUser) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const adminUser = new User({
      name: 'Admin User',
      email: adminEmail,
      password: 'adminpassword123', // This will be hashed by the model pre-save hook
      role: 'admin'
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@cpcr.in');
    console.log('Password: adminpassword123');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
