const User = require('../models/User');
const Recipe = require('../models/Recipe');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('username bio avatar createdAt followers following');
  if (!user) { res.status(404); throw new Error('User not found'); }
  const recipes = await Recipe.find({ author: user._id }).select('-likes -ratings').sort({ createdAt: -1 });
  res.json({
    _id: user._id, username: user.username, bio: user.bio, avatar: user.avatar, createdAt: user.createdAt,
    followersCount: user.followers.length, followingCount: user.following.length,
    isFollowing: !!req.user && user.followers.some(f => f.equals(req.user._id)), recipes,
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const { username, bio } = req.body;
  if (username) req.user.username = username;
  if (bio !== undefined) req.user.bio = bio;
  if (req.file) req.user.avatar = `/uploads/${req.file.filename}`;
  await req.user.save();
  res.json(req.user);
});

exports.getBookmarks = asyncHandler(async (req, res) => {
  const recipes = await Recipe.find({ _id: { $in: req.user.bookmarks } }).select('-likes -ratings').populate('author', 'username avatar');
  res.json(recipes);
});

exports.toggleFollow = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (req.user._id.equals(targetId)) { res.status(400); throw new Error("You can't follow yourself"); }
  if (!(await User.exists({ _id: targetId }))) { res.status(404); throw new Error('User not found'); }
  const following = req.user.following.some(f => f.equals(targetId));
  const op = following ? '$pull' : '$addToSet';
  await Promise.all([
    User.updateOne({ _id: req.user._id }, { [op]: { following: targetId } }),
    User.updateOne({ _id: targetId }, { [op]: { followers: req.user._id } }),
  ]);
  res.json({ following: !following });
});
