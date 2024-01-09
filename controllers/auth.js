const jwt = require("jsonwebtoken");

const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const otpGenerator = require("otp-generator");

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

  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
};

exports.verifyOTP = async (req, res, next) => {
    // verify otp by updating the user record
    const {email, otp} = req.body;
    const user = await User.findOne({email: email, otpExpiryTime: {$gt: Date.now()}});
    if(!user) {
        res.status(400).json({
            status: "error",
            message: "Email invalid or OTP expired"
        });
    }
    if(otp === user.otp) {
        
    }

}

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
  });
};
