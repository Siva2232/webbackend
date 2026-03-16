const Product = require("../models/Product");
const Registration = require("../models/Registration");

const buildRegistrationFilter = (query = {}) => {
  const { startDate, endDate } = query;
  const registrationFilter = {};

  if (startDate || endDate) {
    registrationFilter.registrationDate = {};

    if (startDate) {
      registrationFilter.registrationDate.$gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      registrationFilter.registrationDate.$lte = end;
    }
  }

  return registrationFilter;
};

const getRegistrationQuery = (filter = {}) => {
  return Registration.find(filter)
    .populate("productId", "productName modelNumber")
    .sort({ registrationDate: -1 });
};

exports.getStats = async (req, res) => {
  try {
    const registrationFilter = buildRegistrationFilter(req.query);

    const totalProducts = await Product.countDocuments();
    const registeredWarranties = await Registration.countDocuments();
    
    // For "Active Warranties", we could filter registrations where warranty hasn't expired
    // But for a simple dashboard, these two are the main ones.
    const activeWarranties = registeredWarranties; 

    // Fetch the filtered recent registrations
    const recentRegistrations = await getRegistrationQuery(registrationFilter)
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

exports.getRegistrationLedger = async (req, res) => {
  try {
    const registrationFilter = buildRegistrationFilter(req.query);
    const registrations = await getRegistrationQuery(registrationFilter);

    res.json({
      registrations,
      total: registrations.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
