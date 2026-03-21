const express = require("express");
const router = express.Router();
const { loginAdmin, registerAdmin, changePassword } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", protect, registerAdmin);
router.post("/login", loginAdmin);
router.post("/change-password", changePassword);

module.exports = router;
