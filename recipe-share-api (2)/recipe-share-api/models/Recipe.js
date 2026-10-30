const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 1000 },
  ingredients: [{ name: { type: String, required: true }, quantity: { type: String, default: '' }, _id: false }],
  steps: [{ type: String, required: true }],
  cookTime: { type: Number, min: 0, default: 0 },       // minutes
  servings: { type: Number, min: 1, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  category: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'drink', 'other'], default: 'other' },
  tags: [{ type: String, lowercase: true, trim: true }],
  image: { type: String, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  ratings: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, value: { type: Number, min: 1, max: 5 }, _id: false }],
  avgRating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
}, { timestamps: true });

recipeSchema.index({ title: 'text', description: 'text', tags: 'text' });
recipeSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
