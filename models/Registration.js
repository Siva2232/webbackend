const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    serialNumber: {
      type: String,
      required: false,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    modelNumber: {
      type: String,
      trim: true,
    },
    carModelName: {
      type: String,
      trim: true,
      default: "",
    },
    purchaseShopName: {
      type: String,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    warrantyStatus: {
      type: String,
      enum: ["Active", "Expired", "Not Registered"],
      default: "Active",
    },
    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);