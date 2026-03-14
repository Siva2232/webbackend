const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const app = express();

// When running behind a proxy (e.g., Render), enable trust proxy so express-rate-limit
// can correctly identify client IPs from the X-Forwarded-For header.
app.set("trust proxy", 1);

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// Enable CORS with options
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",

  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// Data sanitization against NoSQL query injection
// express-mongo-sanitize may throw in environments where req.query is read-only.
// Instead, sanitize in-place using the provided utility.
app.use((req, res, next) => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.params);
  mongoSanitize.sanitize(req.headers);
  mongoSanitize.sanitize(req.query);
  next();
});

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Routes
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/register", require("./routes/registrationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/service", require("./routes/serviceRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.get("/", (req, res) => {
  res.send("Warranty Tracker API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);