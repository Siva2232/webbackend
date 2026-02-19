const Product = require("../models/Product");
const Registration = require("../models/Registration");

exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Filter for registrations
    let registrationFilter = {};
    if (startDate || endDate) {
      registrationFilter.registrationDate = {};
      if (startDate) registrationFilter.registrationDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        registrationFilter.registrationDate.$lte = end;
      }
    }

    const totalProducts = await Product.countDocuments();
    const registeredWarranties = await Registration.countDocuments();
    
    // For "Active Warranties", we could filter registrations where warranty hasn't expired
    // But for a simple dashboard, these two are the main ones.
    const activeWarranties = registeredWarranties; 

    // Fetch the filtered recent registrations
    const recentRegistrations = await Registration.find(registrationFilter)
      .populate("productId", "productName")
      .sort({ registrationDate: -1 })
      .limit(10); // Increased limit for filtered views

    res.json({
      totalProducts,
      registeredWarranties,
      activeWarranties,
      recentRegistrations: recentRegistrations || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
