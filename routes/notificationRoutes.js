const express = require("express");
const router = express.Router();
const { getUnreadCount, getNotifications, markAsRead, deleteNotification } = require("../controllers/notificationController");

router.get("/unread", getUnreadCount);
router.get("/", getNotifications);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;