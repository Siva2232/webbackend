const express = require("express");
const router = express.Router();
const { loginAdmin, registerAdmin, forgotPassword } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", protect, registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);

module.exports = router;
