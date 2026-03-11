const express = require("express");
const router = express.Router();
const { registerWarranty, getRegistrations, updateRegistration } = require("../controllers/registrationController");
const protect = require("../middleware/authMiddleware");

router.post("/", registerWarranty);
router.get("/", protect, getRegistrations);
router.put("/:id", protect, updateRegistration);

module.exports = router;
