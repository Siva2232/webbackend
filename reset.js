const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const resetAdminLocks = async () => {
  try {
    // 1. Connect to Database
    if (!process.env.MONGO_URI) {
      console.error('❌ Error: MONGO_URI is not defined in .env file');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Reset Attempts and Unlocks Accounts
    const result = await Admin.updateMany(
      {}, 
      { 
        $set: { 
          loginAttempts: 0 
        },
        $unset: { 
          lockUntil: "" 
        } 
      }
    );

    console.log('-----------------------------------------');
    console.log(`🚀 SUCCESS: Reset login attempts for ${result.modifiedCount} admin accounts.`);
    console.log('🔓 All accounts have been unlocked and granted 3 new attempts.');
    console.log('-----------------------------------------');

    // 3. Close Connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to reset admin locks:', error.message);
    process.exit(1);
  }
};

// Start the reset process
resetAdminLocks();
