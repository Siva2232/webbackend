const express = require("express");
const router = express.Router();
const { registerWarranty, getRegistrations } = require("../controllers/registrationController");
const protect = require("../middleware/authMiddleware");

router.post("/", registerWarranty);
router.get("/", protect, getRegistrations);

module.exports = router;
