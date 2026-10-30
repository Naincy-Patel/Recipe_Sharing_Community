const router = require('express').Router();
const c = require('../controllers/users');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.put('/me', protect, upload.single('avatar'), c.updateMe);
router.get('/me/bookmarks', protect, c.getBookmarks);
router.get('/:id', optionalAuth, c.getProfile);
router.post('/:id/follow', protect, c.toggleFollow);
module.exports = router;
