const ServiceRecord = require("../models/ServiceRecord");
const Registration = require("../models/Registration");
const Notification = require("../models/Notification");

// Search Service History & Warranty Status
exports.lookupServiceHistory = async (req, res) => {
  try {
    const { serialNumber, modelNumber, q } = req.query;

    // If no query parameters, return recent service records (e.g., last 50)
    if (!serialNumber && !modelNumber && !q) {
      // Use aggregation to group by serial number and return only the most recent record per item
      const recentServices = await ServiceRecord.aggregate([
        { $sort: { receivedDate: -1 } },
        { 
          $group: { 
            _id: "$serialNumber", 
            latestRecord: { $first: "$$ROOT" } 
          } 
        },
        { $replaceRoot: { newRoot: "$latestRecord" } },
        { $sort: { receivedDate: -1 } },
        { $limit: 50 }
      ]);
      return res.json({ recentServices });
    }

    // Search query logic
    const query = {};
    if (q) {
      // Basic heuristic: check both OR use strict match
      // For mongoose, we can use $or
      const trimQ = q.trim();
      query.$or = [
        { serialNumber: trimQ }, 
        { modelNumber: trimQ },
        { phone: trimQ } 
      ];
    } else {
      if (serialNumber) query.serialNumber = serialNumber;
      else if (modelNumber) query.modelNumber = modelNumber;
    }

    // 1. Check existing Service Records
    const serviceHistory = await ServiceRecord.find(query).sort({ receivedDate: -1 });
    
    // 2. Check Warranty Registration
    let registration = null;
    if (query.$or) {
       registration = await Registration.findOne({ $or: query.$or });
    } else if (query.serialNumber) {
       registration = await Registration.findOne({ serialNumber: query.serialNumber });
    }

    // 3. Stats
    const totalClaims = serviceHistory.length;
    const pendingServices = serviceHistory.filter(s => s.status !== "Returned").length;
    
    // Calculate total costs if needed, but let's just return history.

    // 4. Determine Current Warranty Status
    let warrantyStatus = "Not Registered";
    let expiryDate = null;

    if (registration) {
      warrantyStatus = "Active";
      expiryDate = new Date(registration.registrationDate);
      // Assuming 12 months default if not stored or fetched from product
      // Actually registration schema has expiryDate, let's use it.
      if (registration.expiryDate) {
        if (new Date() > new Date(registration.expiryDate)) {
          warrantyStatus = "Expired";
        }
      }
    } else {
        // Fallback: If no registration, check Service Records to see if we've seen it before? 
        // Or if we can find the Product manufacture date (not implemented here without product lookup).
    }

    res.json({
      registration,
      serviceHistory,
      stats: {
        totalClaims,
        recentIssue: serviceHistory.length > 0 ? serviceHistory[0].issueDescription : null,
        warrantyStatus,
        expiryDate
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error lookupServiceHistory" });
  }
};

// Create New Service Entry
exports.createServiceRecord = async (req, res) => {
  try {
    const { serialNumber, modelNumber, customerName, phone, issueDescription, serviceCost, notes, technicianName } = req.body;

    // Validate
    if (!serialNumber || !customerName || !issueDescription) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newService = new ServiceRecord({
      serialNumber,
      modelNumber,
      customerName,
      phone,
      issueDescription,
      serviceCost: serviceCost || 0,
      technicianNotes: notes,
      technicianName: technicianName,
      status: "Received",
      receivedDate: new Date(),
    });

    const savedService = await newService.save();

    await Notification.create({
      type: "SERVICE_UPDATE",
      message: `Service Alert: ${customerName} reported issue for ${serialNumber}`,
    });

    res.status(201).json(savedService);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating service record." });
  }
};

// Update Service Status (e.g., Mark Returned/Paid)
exports.updateServiceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, serviceCost, technicianNotes, technicianName, shopName } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (serviceCost !== undefined) updates.serviceCost = serviceCost; // Allow 0
    if (technicianNotes) updates.technicianNotes = technicianNotes;
    if (technicianName) updates.technicianName = technicianName;
    if (shopName) updates.shopName = shopName;

    // Auto set returnedDate if status becomes Returned
    if (status === "Returned") {
      updates.returnedDate = new Date();
    }

    const updatedRecord = await ServiceRecord.findByIdAndUpdate(id, updates, { returnDocument: 'after' });
    
    if (!updatedRecord) {
        return res.status(404).json({ message: "Record not found" });
    }

    res.json(updatedRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating record." });
  }
};
