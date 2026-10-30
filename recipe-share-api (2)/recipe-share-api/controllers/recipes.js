const Recipe = require('../models/Recipe');
const Comment = require('../models/Comment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const parseJSON = (v, fallback) => { if (v === undefined) return fallback; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v.split(',').map(s => s.trim()).filter(Boolean); } };

const buildBody = (req) => {
  const b = req.body;
  const data = { title: b.title, description: b.description, cookTime: b.cookTime, servings: b.servings, difficulty: b.difficulty, category: b.category };
  if (b.ingredients !== undefined) data.ingredients = parseJSON(b.ingredients, []);
  if (b.steps !== undefined) data.steps = parseJSON(b.steps, []);
  if (b.tags !== undefined) data.tags = parseJSON(b.tags, []);
  if (req.file) data.image = `/uploads/${req.file.filename}`;
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  return data;
};

const canModify = (user, recipe) => recipe.author.equals(user._id) || user.role === 'admin';

exports.createRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.create({ ...buildBody(req), author: req.user._id });
  res.status(201).json(recipe);
});

// GET /api/recipes?q=&category=&tag=&author=&difficulty=&maxTime=&sort=latest|popular|rated&page=&limit=
exports.getRecipes = asyncHandler(async (req, res) => {
  const { q, category, tag, author, difficulty, maxTime, sort = 'latest' } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 12, 50);
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (tag) filter.tags = tag.toLowerCase();
  if (author) filter.author = author;
  if (difficulty) filter.difficulty = difficulty;
  if (maxTime) filter.cookTime = { $lte: Number(maxTime) };
  const sorts = { latest: { createdAt: -1 }, popular: { likesCount: -1, createdAt: -1 }, rated: { avgRating: -1, ratingsCount: -1 } };

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).select('-likes -ratings').populate('author', 'username avatar')
      .sort(sorts[sort] || sorts.latest).skip((page - 1) * limit).limit(limit),
    Recipe.countDocuments(filter),
  ]);
  res.json({ recipes, page, pages: Math.ceil(total / limit), total });
});

// Recipes from people the user follows
exports.getFeed = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = 12;
  const recipes = await Recipe.find({ author: { $in: req.user.following } }).select('-likes -ratings')
    .populate('author', 'username avatar').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  res.json({ recipes, page });
});

exports.getRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id).populate('author', 'username avatar bio').lean();
  if (!recipe) { res.status(404); throw new Error('Recipe not found'); }
  const uid = req.user && req.user._id.toString();
  recipe.liked = !!uid && recipe.likes.some(l => l.toString() === uid);
  recipe.myRating = uid ? (recipe.ratings.find(r => r.user.toString() === uid) || {}).value || null : null;
  recipe.bookmarked = !!req.user && req.user.bookmarks.some(b => b.equals(recipe._id));
  delete recipe.likes; delete recipe.ratings;
  res.json(recipe);
});

exports.updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) { res.status(404); throw new Error('Recipe not found'); }
  if (!canModify(req.user, recipe)) { res.status(403); throw new Error('Not allowed to edit this recipe'); }
  Object.assign(recipe, buildBody(req));
  await recipe.save();
  res.json(recipe);
});

exports.deleteRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) { res.status(404); throw new Error('Recipe not found'); }
  if (!canModify(req.user, recipe)) { res.status(403); throw new Error('Not allowed to delete this recipe'); }
  await Promise.all([recipe.deleteOne(), Comment.deleteMany({ recipe: recipe._id }), User.updateMany({}, { $pull: { bookmarks: recipe._id } })]);
  res.json({ message: 'Recipe deleted' });
});

exports.toggleLike = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) { res.status(404); throw new Error('Recipe not found'); }
  const i = recipe.likes.findIndex(u => u.equals(req.user._id));
  i === -1 ? recipe.likes.push(req.user._id) : recipe.likes.splice(i, 1);
  recipe.likesCount = recipe.likes.length;
  await recipe.save();
  res.json({ liked: i === -1, likesCount: recipe.likesCount });
});

exports.rateRecipe = asyncHandler(async (req, res) => {
  const value = Number(req.body.value);
  if (!(value >= 1 && value <= 5)) { res.status(400); throw new Error('Rating must be between 1 and 5'); }
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) { res.status(404); throw new Error('Recipe not found'); }
  const existing = recipe.ratings.find(r => r.user.equals(req.user._id));
  existing ? (existing.value = value) : recipe.ratings.push({ user: req.user._id, value });
  recipe.ratingsCount = recipe.ratings.length;
  recipe.avgRating = Math.round((recipe.ratings.reduce((s, r) => s + r.value, 0) / recipe.ratingsCount) * 10) / 10;
  await recipe.save();
  res.json({ avgRating: recipe.avgRating, ratingsCount: recipe.ratingsCount });
});

exports.toggleBookmark = asyncHandler(async (req, res) => {
  const recipe = await Recipe.exists({ _id: req.params.id });
  if (!recipe) { res.status(404); throw new Error('Recipe not found'); }
  const has = req.user.bookmarks.some(b => b.equals(req.params.id));
  await User.updateOne({ _id: req.user._id }, has ? { $pull: { bookmarks: req.params.id } } : { $addToSet: { bookmarks: req.params.id } });
  res.json({ bookmarked: !has });
});

// ---- Comments ----
exports.getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ recipe: req.params.id }).populate('user', 'username avatar').sort({ createdAt: -1 });
  res.json(comments);
});

exports.addComment = asyncHandler(async (req, res) => {
  if (!req.body.text) { res.status(400); throw new Error('Comment text is required'); }
  if (!(await Recipe.exists({ _id: req.params.id }))) { res.status(404); throw new Error('Recipe not found'); }
  const c = await Comment.create({ recipe: req.params.id, user: req.user._id, text: req.body.text });
  res.status(201).json(await c.populate('user', 'username avatar'));
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.commentId);
  if (!c) { res.status(404); throw new Error('Comment not found'); }
  if (!c.user.equals(req.user._id) && req.user.role !== 'admin') { res.status(403); throw new Error('Not allowed'); }
  await c.deleteOne();
  res.json({ message: 'Comment deleted' });
});
