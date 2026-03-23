const mongoose = require("mongoose");
const Admin = require("./models/Admin");
const dotenv = require("dotenv");

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const admins = [
      {
        name: "Super Admin",
        email: "admin@lancaster.com",
        password: "lancaster@123",
      },
      {
        name: "System Admin",
        email: "admin1@lancaster.com",
        password: "lancaster@123",
      },
      {
        name: "Service Dashboard",
        email: "service@lancaster.com",
        password: "service@123",
      }
    ];

    for (const adminData of admins) {
      const adminExists = await Admin.findOne({ email: adminData.email });
      if (adminExists) {
        console.log(`Admin ${adminData.email} already exists!`);
        continue;
      }

      await Admin.create(adminData);
      console.log(`Admin account created: ${adminData.email}`);
    }

    console.log("Seeding process completed!");
    process.exit();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
