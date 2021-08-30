const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  cart: [
    {
      productId: String,
      quantity: Number,
    },
  ],
  cart: [
    {
      productId: String,
      name: String,
      price: Number,
      img: String,
      total: Number,
      quantity: Number,
    },
  ],
});

module.exports = mongoose.model("user", UserSchema);
