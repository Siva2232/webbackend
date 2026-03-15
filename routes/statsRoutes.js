const express = require("express");
const router = express.Router();
const { getStats, getRegistrations } = require("../controllers/statsController");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, getStats);
router.get("/registrations", protect, getRegistrations);

module.exports = router;
