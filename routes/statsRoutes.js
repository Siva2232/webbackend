const express = require("express");
const router = express.Router();
const { getStats, getRegistrationLedger } = require("../controllers/statsController");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, getStats);
router.get("/ledger", protect, getRegistrationLedger);

module.exports = router;
