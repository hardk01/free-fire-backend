const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ msg: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ msg: 'Access denied: Admins only' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error('Admin Auth Error:', err.message);
    res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

module.exports = adminAuth;
