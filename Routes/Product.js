const express = require("express");
const jwt = require("jsonwebtoken");
const Product = require("../Models/Product.js");
const User = require("../Models/User.js");
const Auth = require("../Middleware/Auth.js");

const router = express.Router();

router
  .route("/product")
  // Get All Product Details
  .get(async (request, response) => {
    const products = await Product.find();
    response.status(200).send(products);
  })
  //Add Product
  .post(async (request, response) => {
    try {
      const { name, desc, price, countInStock, imageUrl } = request.body;

      const product = new Product({
        name,
        desc,
        price,
        countInStock,
        imageUrl,
      });
      await product.save();
      response.status(200).send(product);
    } catch (error) {
      response.status(500).send({ message: "Server Error" });
    }
  });

// Find Product By Id
router.route("/product/id").post(async (request, response) => {
  try {
    const { id } = request.body;
    const product = await Product.findById(id);
    response.status(200).send(product);
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
  }
});

router.route("/product/:id").get(async (request, response) => {
  try {
    const id = request.params.id;
    const product = await Product.findById(id);
    response.status(200).send(product);
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
  }
});

// User Data

// Signup
router.route("/signup").post(async (request, response) => {
  try {
    const { name, email, password } = request.body;
    const exist = await User.findOne({ email: email });
    if (exist) {
      return response.status(409).json({ error: "Email All Ready Exist" });
    } else {
      const user = new User({
        name,
        email,
        password,
      });
      await user.save();
      response.status(200).json({ message: "User Registered" });
    }
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
    console.log(error);
  }
});

// Signin
router.route("/signin").post(async (request, response) => {
  try {
    const { email, password } = request.body;
    const findUser = await User.findOne({ email: email });
    if (!findUser) {
      return response.status(401).send({ message: "Invalid credentials" });
    } else if (findUser.password === password) {
      const genToken = jwt.sign({ id: findUser._id }, process.env.SECRET_KEY);
      response.cookie("jwtToken", genToken, {
        expires: new Date(new Date().getTime() + 3600 * 1000),
        sameSite: "none",
        httpOnly: false,
        secure: true,
      });
      return response.status(200).send(findUser);
    } else {
      return response.status(401).send({ message: "Invalid credentials" });
    }
  } catch (err) {
    response.status(500).send(err);
  }
});

// Add to cart
router.route("/add_to_cart").post(async (request, response) => {
  const { productId, id } = request.body;
  try {
    let user = await User.findById(id);
    let product = await Product.findById(productId);
    if (user) {
      let itemIndex = await user.cart.findIndex(
        (p) => p.productId === productId
      );
      if (itemIndex > -1) {
        let productItem = user.cart[itemIndex];
        productItem.quantity += 1;
        productItem.total += product.price;
        user.cart[itemIndex] = productItem;
      } else {
        user.cart.push({
          productId,
          name: product.name,
          price: product.price,
          img: product.imageUrl,
          total: product.price,
          quantity: 1,
        });
      }
      user = await user.save();
      return response.status(200).send(user);
    } else {
      return response.status(404).send({ message: "No User Found" });
    }
  } catch (error) {
    response.status(500).send(error);
    console.log(error);
  }
});

// Remove From Cart
router.route("/remove_from_cart").post(async (request, response) => {
  const { productId, id } = request.body;
  try {
    let user = await User.findById(id);
    let product = await Product.findById(productId);
    if (user) {
      let itemIndex = await user.cart.findIndex(
        (p) => p.productId === productId
      );
      if (itemIndex > -1) {
        let productItem = user.cart[itemIndex];
        if (productItem.quantity > 0) {
          productItem.quantity -= 1;
          productItem.total -= product.price;
          user.cart[itemIndex] = productItem;
        } else response.status(500).send("Server Error");
      } else {
        return response.status(404).send({ message: "No Product Found" });
      }
      user = await user.save();
      return response.status(201).send(user);
    } else {
      return response.status(404).send({ message: "No User Found" });
    }
  } catch (error) {
    response.status(500).send(error);
    console.log(error);
  }
});

// Delete From Cart
router.route("/delete_from_cart").delete(async (request, response) => {
  const { itemId, id } = request.body;
  try {
    let user = await User.findById(id);
    if (user) {
      user.cart.pull({ _id: itemId });
      user = await user.save();
      return response.status(201).send(user);
    } else {
      return response.status(404).send({ message: "No User Found" });
    }
  } catch (error) {
    response.status(500).send(error);
    console.log(error);
  }
});

// Secured Routes
router.route("/home").get(Auth, (request, response) => {
  response.status(200).send(request.rootUser);
});

module.exports = router;
