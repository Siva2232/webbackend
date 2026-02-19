const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    qrCodeUrl: {
      type: String,
    },
    manufactureDate: {
      type: Date,
    },
    warrantyPeriodMonths: {
      type: Number,
      default: 12,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);