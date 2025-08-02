require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

// Connect DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected');

  const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
  if (existingAdmin) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const newAdmin = new Admin({
    email: 'admin@example.com',
    password: hashedPassword,
    isAdmin: true
  });

  await newAdmin.save();
  console.log('Admin seeded successfully');
  process.exit(0);
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});
