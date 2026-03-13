const express = require("express");
const router = express.Router();
const { loginAdmin, registerAdmin } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", protect, registerAdmin);
router.post("/login", loginAdmin);

module.exports = router;
