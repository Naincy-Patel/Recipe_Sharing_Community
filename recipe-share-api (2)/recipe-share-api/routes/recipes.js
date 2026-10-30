const router = require('express').Router();
const c = require('../controllers/recipes');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/').get(c.getRecipes).post(protect, upload.single('image'), c.createRecipe);
router.get('/feed', protect, c.getFeed);
router.route('/:id').get(optionalAuth, c.getRecipe).put(protect, upload.single('image'), c.updateRecipe).delete(protect, c.deleteRecipe);
router.post('/:id/like', protect, c.toggleLike);
router.post('/:id/rate', protect, c.rateRecipe);
router.post('/:id/bookmark', protect, c.toggleBookmark);
router.route('/:id/comments').get(c.getComments).post(protect, c.addComment);
router.delete('/:id/comments/:commentId', protect, c.deleteComment);
module.exports = router;
