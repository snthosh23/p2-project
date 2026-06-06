const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMonthlyReport,
  getDashboardStats,
  getFinancialHealthScore,
  getAISpendingInsights,
  exportPDFReport
} = require('../controllers/reportController');

router.use(protect);

router.get('/monthly', getMonthlyReport);
router.get('/dashboard-stats', getDashboardStats);
router.get('/health-score', getFinancialHealthScore);
router.get('/insights', getAISpendingInsights);
router.get('/export/pdf', exportPDFReport);

module.exports = router;
