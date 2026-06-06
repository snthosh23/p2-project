const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProfile, updateProfile, purgeData } = require('../controllers/profileController');

router.use(protect);

router.route('/')
  .get(getProfile)
  .put(updateProfile);

router.delete('/purge', purgeData);

module.exports = router;
