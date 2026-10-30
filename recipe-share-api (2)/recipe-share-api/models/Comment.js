const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500, trim: true },
}, { timestamps: true });
module.exports = mongoose.model('Comment', commentSchema);
