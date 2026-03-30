const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Admin = require("./models/Admin");

// Load env vars
dotenv.config();

const resetAdminLocks = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/warranty_portal");
    console.log("Connected successfully.");

    console.log("Resetting login attempts and locks for all admins...");
    
    const result = await Admin.updateMany(
      {}, 
      { 
        $set: { 
          loginAttempts: 0,
          lockUntil: null 
        } 
      }
    );

    console.log(`Success! Reset ${result.modifiedCount} admin accounts.`);
    console.log("Admins can now attempt to login again.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error resetting admin locks:", error);
    process.exit(1);
  }
};

resetAdminLocks();
