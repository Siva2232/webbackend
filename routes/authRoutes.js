const express = require("express");
const router = express.Router();
const { loginAdmin, registerAdmin, forgotPassword, getMe, updateProfile, changePassword } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", protect, registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);

// Settings routes — all protected
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;
