const express = require("express");
const router = express.Router();
const { getUnreadCount, getNotifications, markAsRead, deleteNotification } = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

router.get("/unread", protect, getUnreadCount);
router.get("/", protect, getNotifications);
router.put("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;