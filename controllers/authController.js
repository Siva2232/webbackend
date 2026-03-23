const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Admin Registration
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    // Check if account is locked
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(403).json({
        message: `Account is locked. Please try again after ${remainingTime} minutes or contact support.`,
        lockUntil: admin.lockUntil,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      // Increment login attempts
      admin.loginAttempts += 1;

      let lockUntil = null;
      if (admin.loginAttempts >= 3) {
        // After 3 failed attempts, set lock period
        // The user request says: "if 3 attempt failed thenafter 15 minutes then ebalbe to retry... ater 3 attempt faied 1 hr wait or call support"
        // Interpreting as: 3rd failed attempt = 15 min lock, subsequent failed attempts (or if we want a stricter lock) = 1 hr.
        // Let's implement: 3 failed attempts = 15 min. 4+ failed attempts = 1 hour.
        const lockDuration = admin.loginAttempts === 3 ? 15 * 60 * 1000 : 60 * 60 * 1000;
        lockUntil = Date.now() + lockDuration;
        admin.lockUntil = lockUntil;
      }

      await admin.save();

      const remainingAttempts = 3 - admin.loginAttempts;
      let message = "Invalid credentials";
      if (remainingAttempts > 0) {
        message += `. You have ${remainingAttempts} attempts remaining.`;
      } else {
        const lockTime = admin.loginAttempts === 3 ? "15 minutes" : "1 hour";
        message = `Too many failed attempts. Account locked for ${lockTime}. Please contact support if issues persist.`;
      }

      return res.status(400).json({ message });
    }

    // Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error: JWT_SECRET is not set." });
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Forgot / Reset Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin account not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // Manually hash and use findByIdAndUpdate to bypass pre-save hook (avoids double-hashing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Admin.findByIdAndUpdate(admin._id, { password: hashedPassword });

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};