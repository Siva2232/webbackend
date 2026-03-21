const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const { loginAdmin, registerAdmin, forgotPassword } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

router.post(
  "/register",
  protect,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validateRequest,
  registerAdmin
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  loginAdmin
);

router.post(
  "/forgot-password",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("oldPassword").notEmpty().withMessage("Old password is required"),
    body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
  ],
  validateRequest,
  forgotPassword
);

module.exports = router;
