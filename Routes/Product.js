const express = require("express");
const jwt = require("jsonwebtoken");
const Product = require("../Models/Product.js");
const User = require("../Models/User.js");
const nodemailer = require("nodemailer");
const Auth = require("../Middleware/Auth.js");

// Transporter For Mail Sending
const transport = nodemailer.createTransport({
  host: "in-v3.mailjet.com",
  port: 587,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

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
      const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
        expiresIn: "1d",
      });

      transport.sendMail({
        to: user.email,
        from: process.env.EMAIL,
        subject: `Signup Successful`,
        html: `
        <h1>Welcome, ${user.name} To Dark Store</h1>
        <h5>Click on <a href="https://e-commerce-site-v1.herokuapp.com/verify?token=${token}">Link</a> , To Activate Account.</h5>
        <p>Doing The Above Step Help US :)</p>
        `,
      });

      response.status(200).json({ message: "User Registered" });
    }
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
    console.log(error);
  }
});

// Verify Email After Signup
router.route("/verify").get(async (request, response) => {
  try {
    const token = request.query.token;
    if (token) {
      const { id } = jwt.verify(token, process.env.SECRET_KEY);
      await User.updateOne({ _id: id }, { confirm: true });
      return response.redirect("https://ecommerce-site-v2.netlify.app/signin");
    } else {
      return response.status(401).json({ message: "Invalid Token" });
    }
  } catch (err) {
    response.status(500).send({ message: "Server Error" });
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
      // response.cookie("jwtToken", genToken, {
      //   expires: new Date(new Date().getTime() + 3600 * 1000),
      //   sameSite: "none",
      //   httpOnly: false,
      //   secure: true,
      // });

      return response.status(200).send({ user: findUser, token: genToken });
    } else {
      return response.status(401).send({ message: "Invalid credentials" });
    }
  } catch (err) {
    response.status(500).send(err);
  }
});

// Find User
router.route("/user/:id").get(async (request, response) => {
  const id = request.params.id;
  try {
    const user = await User.findById(id);
    response.status(200).send(user);
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
  }
});

// Update User
router.route("/user/update/:id").patch(async (request, response) => {
  try {
    const id = request.params.id;
    const user = await User.findByIdAndUpdate(id, request.body);
    response.status(200).send("User Updated");
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
  }
});

//Forgot Password Link Creation
router.route("/reset").post(async (request, response) => {
  const { email } = request.body;
  try {
    const findUser = await User.findOne({ email: email });
    if (!findUser) {
      return response.status(401).json({ message: "Register First" });
    }
    const token = jwt.sign({ id: findUser._id }, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });
    findUser.resetToken = token;
    findUser.expireTime = Date.now() + 3600000;

    await findUser.save();

    transport.sendMail({
      to: findUser.email,
      from: process.env.EMAIL,
      subject: `To Reset Password`,
      html: `
                  <p>You Requested For Password Reset</p>
                  <h5>Click on <a href="https://ecommerce-site-v2.netlify.app/password_reset/${token}">Link</a> , to RESET Password.</h5>
                `,
    });
    response.status(200).json({ message: "Email Send." });
  } catch (error) {
    response.status(500);
    response.send(error);
  }
});

//Password Reset
router.route("/password-reset").post(async (request, response) => {
  const { newPassword, sentToken } = request.body;
  try {
    const findUser = await User.findOne({
      resetToken: sentToken,
      expireTime: { $gt: Date.now() },
    });
    if (!findUser) {
      return response.status(403).json({ message: "Session Expired" });
    }

    findUser.password = newPassword;
    findUser.resetToken = undefined;
    findUser.expireTime = undefined;

    await findUser.save();
    response.status(200).json({ message: "Password Updated" });
  } catch (error) {
    response.status(500);
    response.send(error);
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

// Empty cart
router.route("/update_cart").patch(async (request, response) => {
  const { id } = request.body;
  try {
    let user = await User.findById(id);
    console.log(user);
    if (user) {
      user.cart = [];
      user = await user.save();
      return response.status(200).send(user);
    } else {
      return response.status(404).send({ message: "No User Found" });
    }
  } catch (error) {
    response.status(500).send({ message: "Server Error" });
  }
});

// Secured Routes
router.route("/home").get(Auth, (request, response) => {
  response.status(200).send(request.rootUser);
});

module.exports = router;
