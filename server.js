const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT;

const url = process.env.MONGO_URL;

// MongoDB Connection
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const con = mongoose.connection;
con.on("open", () => console.log("MongoDB is connected"));

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use("/", require("./Routes/Product.js"));

app.get("/", (request, response) => {
  response.json({ message: "Welcome to E-Commerce API" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
