const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["REGISTRATION", "WARRANTY_EXPIRY", "SERVICE_UPDATE"],
      default: "REGISTRATION",
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Registration",
      },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
