const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getBudgets, setBudget, getRecommendations } = require('../controllers/budgetController');

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(setBudget);

router.get('/recommendations', getRecommendations);

module.exports = router;
