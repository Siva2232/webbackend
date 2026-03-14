
const mongoose = require("mongoose");

const serviceRecordSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      required: true,
      index: true,
    },
    modelNumber: {
      type: String,
    },
    customerName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    issueDescription: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Received", "In Progress", "Ready", "Returned"],
      default: "Received",
    },
    receivedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    returnedDate: {
      type: Date, // Date the store sends it back/customer picks it up
    },
    serviceCost: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Waived", "Warranty"],
      default: "Warranty",
    },
    technicianName: {
      type: String,
    },
    shopName: {
      type: String,
    },
    technicianNotes: {
      type: String,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceRecord", serviceRecordSchema);
