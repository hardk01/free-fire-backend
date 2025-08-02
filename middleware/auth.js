const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');

// module.exports = function (req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ msg: 'Unauthorized: No token provided' });
//     }

//     const token = authHeader.split(' ')[1];

//     // ✅ Decode and verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // ✅ Must include adminId for admin routes
//     if (!decoded || !decoded.adminId) {
//       return res.status(401).json({ msg: 'Unauthorized: Missing admin ID in token' });
//     }

//     req.admin = decoded; // Save decoded admin data to req
//     next();
//   } catch (err) {
//     console.error('JWT Auth Error:', err.message);

//     if (err.name === 'TokenExpiredError') {
//       return res.status(401).json({ msg: 'Unauthorized: Token expired' });
//     }

//     return res.status(401).json({ msg: 'Unauthorized: Invalid token' });
//   }
// };

// const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || (!decoded.userId && !decoded.adminId)) {
      return res.status(401).json({ msg: 'Unauthorized: Invalid token payload' });
    }

    if (decoded.userId) {
      req.user = decoded;
    } else if (decoded.adminId) {
      req.admin = decoded;
    }

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expired' });
    }

    res.status(401).json({ msg: 'Unauthorized: Invalid token' });
  }
};

 // Make sure path is correct

// const adminAuth = async (req, res, next) => {
//   const token = req.header('Authorization')?.replace('Bearer ', '');

//   if (!token) return res.status(401).json({ msg: 'No token provided' });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const admin = await Admin.findById(decoded.adminId);
//     if (!admin || !admin.isAdmin) {
//       return res.status(403).json({ msg: 'Access denied: Admins only' });
//     }

//     req.admin = admin;
//     next();
//   } catch (err) {
//     console.error('Admin Auth Error:', err);
//     res.status(401).json({ msg: 'Invalid or expired token' });
//   }
// };

module.exports = authMiddleware;
