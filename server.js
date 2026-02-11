const express = require("express");
require("dotenv").config();
const connectDb = require("./database");
const fs = require("fs");
const https = require("https");
const http = require("http");
const cors = require("cors");
// const { initAgenda } = require('./config/agenda'); // ✅ your agenda setup

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const adminRoutes = require("./routes/adminRoute");
const websiteRoutes = require("./routes/websiteRoute");
const socialRoutes = require("./routes/socialRoute");

app.get("/", (req, res) => {
  res.send("India College Fest API is running smoothly 🚀");
});
app.use("/assets", require("express").static("assets"));
app.use("/admin", adminRoutes);
app.use("/", websiteRoutes);
app.use("/", socialRoutes);

const startServer = async () => {
  await connectDb();

  const PORT = 3001;
  const host = "localhost";
  server.listen(PORT, () => {
    console.log(`Server running at http://${host}:${PORT}`);
  });
};

startServer();
