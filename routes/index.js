const router = require('express').Router();
const authRoute = require('../routes/auth')
const userRoute = require('../routes/user')
 
router.use('/auth', authRoute);
router.use('/user', userRoute);

module.exports = router