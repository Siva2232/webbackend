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
    if (!admin) {
      // Prevent username enumeration by keeping bcrypt timing similar
      const dummyHash = "$2a$10$abcdefghijklmnopqrstuv1234567890ABCDEF1234567890abcde";
      await bcrypt.compare(password, dummyHash).catch(() => {});
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const nowMs = Date.now();

    // Reset lock if the lock-period has expired
    if (admin.lockUntil && new Date(admin.lockUntil).getTime() <= nowMs) {
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      await admin.save();
    }

    // Check if account is locked
    if (admin.lockUntil && new Date(admin.lockUntil).getTime() > nowMs) {
      const remainingTime = Math.ceil((new Date(admin.lockUntil).getTime() - nowMs) / 60000);
      return res.status(403).json({
        message: `Account is locked. Please try again after ${remainingTime} minutes or contact support.`,
        lockUntil: admin.lockUntil,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      // Increment login attempts
      admin.loginAttempts += 1;

      if (admin.loginAttempts >= 3) {
        // Lock account for 1 hour after 3 failed attempts
        admin.lockUntil = new Date(nowMs + 60 * 60 * 1000);
      }

      await admin.save();

      const remainingAttempts = Math.max(0, 3 - admin.loginAttempts);
      let message;

      if (remainingAttempts > 0) {
        message = `Invalid credentials. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining. After that, tech support will lock your account for 1 hour.`;
      } else {
        message = `Login disabled. Please contact tech support or try again after 1 hour.`;
      }

      return res.status(403).json({ message });
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