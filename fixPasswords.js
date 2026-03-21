const mongoose = require("mongoose");
const Admin = require("./models/Admin");
const dotenv = require("dotenv");

dotenv.config();

const updateAdminPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const admins = [
      { email: "admin@lancaster.com", password: "lancaster@123" },
      { email: "admin1@lancaster.com", password: "lancaster@123" }
    ];

    for (const a of admins) {
      const admin = await Admin.findOne({ email: a.email });
      if (admin) {
        // Just setting the password and calling save() triggers the pre-save hook
        admin.password = a.password;
        await admin.save();
        console.log(`Updated and re-hashed password for: ${a.email}`);
      } else {
        console.log(`Admin ${a.email} not found.`);
      }
    }

    console.log("Password fix complete!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updateAdminPasswords();