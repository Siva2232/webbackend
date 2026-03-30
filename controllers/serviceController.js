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

    // 3. Stats
    const isManualRegistration = registration ? Boolean(registration.isManual) : false;
    const isRegistered = registration && !isManualRegistration;

    // Service count should reflect non-manual warranty requests for registered customers,
    // and fall back to all matched history for guest/manual queries.
    const serviceCount = isRegistered ? nonManualHistory.length : serviceHistory.length;
    const totalClaims = isRegistered ? nonManualHistory.length : 0;
    const pendingServices = isRegistered ? nonManualHistory.filter(s => s.status !== "Returned").length : 0;

    // Calculate total costs if needed, but let's just return history.

    // 4. Determine Current Warranty Status
    let warrantyStatus = "Not Registered";
    let expiryDate = null;

    if (registration) {
      const regObj = registration.toObject ? registration.toObject() : registration;

      if (regObj.isManual) {
        // Manual entries are service proxies and should not be treated as closed warranties
        warrantyStatus = "Not Registered";
        expiryDate = null;
        registration.warrantyStatus = "Not Registered";
        registration.expiryDate = null;
      } else {
        if (regObj.expiryDate) {
          expiryDate = new Date(regObj.expiryDate);
        } else if (regObj.purchaseDate) {
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
        registration.warrantyStatus = warrantyStatus;
        registration.expiryDate = expiryDate;
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
        serviceCount,
        pendingServices,
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
      message: `New Service Request: ${customerName} submitted an issue for ${serialNumber || modelNumber}`,
      data: { productId: savedService._id }
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

    if (updates.status === "In Progress") {
      const techPart = updatedRecord.technicianName ? `by ${updatedRecord.technicianName} ` : "";
      await Notification.create({
        type: "SERVICE_IN_PROGRESS",
        message: `In Progress: ${techPart}${updatedRecord.customerName} (${updatedRecord.serialNumber || updatedRecord.modelNumber}) is now being handled`,
        data: { 
          productId: updatedRecord._id,
          technicianName: updatedRecord.technicianName 
        }
      });
    }

    if (updates.status === "Returned") {
      const techPart = updatedRecord.technicianName ? `by ${updatedRecord.technicianName} ` : "";
      await Notification.create({
        type: "SERVICE_RETURNED",
        message: `Returned to Customer: ${techPart}${updatedRecord.customerName} (${updatedRecord.serialNumber || updatedRecord.modelNumber}) has been returned`,
        data: { 
          productId: updatedRecord._id,
          technicianName: updatedRecord.technicianName 
        }
      });
    }

    res.json(updatedRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating record." });
  }
};
// Get Service Stats for Filter Tiles
exports.getServiceStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [received, inProgress, returned, highPriority, today] = await Promise.all([
      ServiceRecord.countDocuments({ status: "Received" }),
      ServiceRecord.countDocuments({ status: "In Progress" }),
      ServiceRecord.countDocuments({ status: "Returned" }),
      ServiceRecord.countDocuments({ priority: "High", status: { $ne: "Returned" } }),
      ServiceRecord.countDocuments({ createdAt: { $gte: startOfToday, $lte: endOfToday } })
    ]);

    res.json({
      received,
      inProgress,
      returned,
      highPriority,
      today
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching service stats" });
  }
};

// Filter Service Records
exports.filterServiceRecords = async (req, res) => {
  try {
    const { type, page, limit } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const perPage = parseInt(limit, 10) || 50;

    const filter = {};
    const now = new Date();

    switch (type) {
      case 'received':
        filter.status = "Received";
        break;
      case 'in-progress':
        filter.status = "In Progress";
        break;
      case 'returned':
        filter.status = "Returned";
        break;
      case 'high-priority':
        filter.priority = "High";
        filter.status = { $ne: "Returned" };
        break;
      case 'today':
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
        break;
      default:
        // Do nothing, fetch all if no type
        break;
    }

    const total = await ServiceRecord.countDocuments(filter);
    const data = await ServiceRecord.find(filter)
      .sort({ receivedDate: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean();

    res.json({
      data,
      total,
      page: pageNum,
      limit: perPage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error filtering service records" });
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