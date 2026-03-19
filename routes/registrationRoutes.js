const express = require("express");
const router = express.Router();
const { registerWarranty, getRegistrations, updateRegistration, deleteRegistration, deleteRegistrations } = require("../controllers/registrationController");
const protect = require("../middleware/authMiddleware");

router.post("/", registerWarranty);
router.get("/", protect, getRegistrations);
router.put("/:id", protect, updateRegistration);
router.delete("/:id", protect, deleteRegistration);
router.delete("/", protect, deleteRegistrations);

module.exports = router;
