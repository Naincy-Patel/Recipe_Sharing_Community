const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const getUser = async (req) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try {
    const { id } = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    return await User.findById(id);
  } catch { return null; }
};

exports.protect = asyncHandler(async (req, res, next) => {
  const user = await getUser(req);
  if (!user) { res.status(401); throw new Error('Not authorized, please log in'); }
  req.user = user;
  next();
});

exports.optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = await getUser(req);
  next();
});
