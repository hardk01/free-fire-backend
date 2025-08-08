const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  freeFireUsername: { type: String, required: true },
  wallet: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // only hash if new/modified
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;

