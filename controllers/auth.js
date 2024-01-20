const jwt = require("jsonwebtoken");

const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const { promisify } = require("util");
const mailService = require("../services/mailer");

const signToken = (userId) => {
  jwt.sign({ userId }, process.env.JWT_SECRET);
};

// Register new user
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  // check if a verified user with given email already exists

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );

  const existingUser = await User.findOne({ email: email });
  if (existingUser && existingUser.verified) {
    res.status(400).json({
      status: "error",
      message: "User already exists. Please login",
    });
  } else if (existingUser) {
    await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });
    req.userId = existingUser._id;
    next();
  } else {
    const newUser = await User.create(filteredBody);

    // generate OTP and send email to user

    req.userId = newUser._id;
    next();
  }
};

exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });
  const otpExpiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  await User.findByIdAndUpdate(userId, {
    otp: new_otp,
    otpExpiryTime: otpExpiryTime,
  });
  // TODO: Send email

  const emailDetails = {
    from: "Candice",
    to: user.email,
    subject: "Here's your OTP",
    html: otp(user.firstName, new_otp)
  }
  try{
   await mailService.sendEmail({emailDetails});
   return res.status(200).json({
    status: "success",
    message: "Your OTP has been sent to " + user.email
   })
  }catch(error){
    return res.status(500).json({
      status: "error",
      message: error.message
    })
  }
  // .then(() => {

  // }).catch((err) => {

  // });


  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
};

exports.verifyOTP = async (req, res, next) => {
  // verify otp by updating the user record
  const { email, otp } = req.body;
  const user = await User.findOne({
    email: email,
    otpExpiryTime: { $gt: Date.now() },
  });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Email invalid or OTP expired",
    });
  }
  if (!(await user.checkOtp(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "Wrong OTP",
    });
  }
  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
    token,
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(401).json({
      status: "error",
      message: "Both email and password are required",
    });
  }
  const userDoc = await User.findOne({ email: email }).select("+password");
  if (!user || !(await userDoc.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Incorrect email or password",
    });
  }

  const token = signToken(userDoc._id);

  res.status(200).json({
    status: "success",
    message: "Sign in successful",
    token,
  });
};

exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else {
    res.status(401).json({
      status: "Error",
      message: "Unauthorized",
    });
    return;
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    res.status(400).json({
      status: "Error",
      message: "Invalid user",
    });
  }
  if (this_user.changedPasswordAfter(decoded.iat)) {
    res.status(400).json({
      status: "Error",
      message: "User recently updated the password! Please login",
    });
  }
  next();
};

exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Email does not exist",
    });
  }

  const resetToken = user.createPasswordResetToken();
  const resetURL = `https://tawk.com/auth/reset-passowrd/?code=${resetToken}`;
  try {
    // TODO=> Create mailer to send email with reset url
    res.status(200).json({
      status: "success",
      message: "Your password link has been sent successfully",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({
      status: "error",
      message:
        "Error while sending reset password link. Please try again later",
    });
  }
};
exports.resetPassword = async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Token is invalid or expired",
    });
    return;
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    message: "Password reset success",
    token,
  });

  //TODO=> Send an email to user informing about password reset
};
