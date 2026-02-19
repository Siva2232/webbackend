const mongoose = require("mongoose");
const Admin = require("./models/Admin");
const dotenv = require("dotenv");

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "admin@example.com";
    const password = "adminpassword123";

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      console.log("Admin already exists!");
      process.exit();
    }

    await Admin.create({
      name: "Super Admin",
      email: email,
      password: password,
    });

    console.log("Admin account created successfully!");
    console.log("Email: " + email);
    console.log("Password: " + password);
    process.exit();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
