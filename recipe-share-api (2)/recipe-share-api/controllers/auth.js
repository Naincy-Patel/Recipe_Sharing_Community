const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const out = (u) => ({ _id: u._id, username: u.username, email: u.email, bio: u.bio, avatar: u.avatar, role: u.role, token: sign(u._id) });

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) { res.status(400); throw new Error('username, email and password are required'); }
  const user = await User.create({ username, email, password });
  res.status(201).json(out(user));
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) { res.status(401); throw new Error('Invalid email or password'); }
  res.json(out(user));
});

exports.me = asyncHandler(async (req, res) => res.json(req.user));
