const Notification = require("../models/Notification");

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get notification history (with pagination or recent limit)
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('data.registrationId', 'productName customerName') // Populate basic info
      
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // If 'all' is passed, mark all as read
    if (id === 'all') {
       await Notification.updateMany({ isRead: false }, { isRead: true });
       return res.json({ message: "All notifications marked as read" });
    }

    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await Notification.deleteMany({});
      return res.json({ message: "All notifications cleared" });
    }
    await Notification.findByIdAndDelete(id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
