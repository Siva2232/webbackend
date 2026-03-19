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
        { $match: { $or: [{ manualEntry: { $exists: false } }, { manualEntry: false }] } },
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
    const serviceHistory = await ServiceRecord.find(query).sort({ receivedDate: -1 }).lean();
    
    // Filter out manual entries for claim calculation
    const nonManualHistory = serviceHistory.filter(s => !s.manualEntry && s.serialNumber && s.serialNumber.trim() !== "");
    
    // 2. Check Warranty Registration
    let registration = null;
    if (query.$or) {
       registration = await Registration.findOne({ $or: query.$or }).populate('productId');
    } else if (query.serialNumber) {
       registration = await Registration.findOne({ serialNumber: query.serialNumber }).populate('productId');
    }

    // 3. Stats (Claims are ONLY for registered products and NON-manual entries)
    const totalClaims = registration ? nonManualHistory.length : 0;
    const pendingServices = registration ? nonManualHistory.filter(s => s.status !== "Returned").length : 0;
    
    // Calculate total costs if needed, but let's just return history.

    // 4. Determine Current Warranty Status
    let warrantyStatus = "Not Registered";
    let expiryDate = null;

    if (registration) {
      const regObj = registration.toObject ? registration.toObject() : registration;

      // Use the stored expiryDate from the registration document
      if (regObj.expiryDate) {
        expiryDate = new Date(regObj.expiryDate);
      } else if (regObj.purchaseDate) {
        // Fallback: Compute expiry as 1 year from purchase if no stored expiry
        const pDate = new Date(regObj.purchaseDate);
        const months = regObj.productId?.warrantyPeriodMonths || 12;
        expiryDate = new Date(pDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);
      }

      if (expiryDate && new Date() > expiryDate) {
        warrantyStatus = "Expired";
      } else if (expiryDate) {
        warrantyStatus = "Active";
      }
    } else {
      warrantyStatus = "Not Registered";
    }

    // Ensure shopName is populated for display if missing in history records but present in registration
    const enrichedHistory = serviceHistory.map(record => ({
      ...record,
      shopName: record.shopName || (registration ? (registration.purchaseShopName || registration.shopName) : '')
    }));

    res.json({
      registration,
      serviceHistory: enrichedHistory,
      stats: {
        totalClaims,
        recentIssue: registration && nonManualHistory.length > 0 ? nonManualHistory[0].issueDescription : null,
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
    const {
      serialNumber,
      modelNumber,
      customerName,
      phone,
      shopName,
      issueDescription,
      serviceCost,
      notes,
      technicianName,
      manualEntry,
      priority
    } = req.body;

    // Validate required fields (serial is optional for manual entries)
    if (!customerName || !issueDescription || !phone) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!manualEntry && !serialNumber) {
      return res.status(400).json({ message: "Serial number is required for registered service entries." });
    }

    const sanitizedPriority = ['High', 'Medium', 'Low'].includes(priority) ? priority : undefined;

    const newService = new ServiceRecord({
      manualEntry: Boolean(manualEntry),
      serialNumber: serialNumber ? String(serialNumber).trim() : null,
      modelNumber,
      customerName,
      phone,
      shopName,
      issueDescription,
      serviceCost: serviceCost || 0,
      technicianNotes: notes,
      technicianName: technicianName,
      priority: sanitizedPriority,
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
    const { status, paymentStatus, serviceCost, technicianNotes, technicianName, shopName, priority } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (serviceCost !== undefined) updates.serviceCost = serviceCost; // Allow 0
    if (technicianNotes) updates.technicianNotes = technicianNotes;
    if (technicianName) updates.technicianName = technicianName;
    if (shopName) updates.shopName = shopName;
    if (priority && ['High', 'Medium', 'Low'].includes(priority)) updates.priority = priority;

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
// Delete Service Record
exports.deleteServiceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await ServiceRecord.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Service record not found" });
    }
    res.json({ message: "Service record deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting service record" });
  }
};