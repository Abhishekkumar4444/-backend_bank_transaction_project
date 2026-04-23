const express = require("express")
const router = express.Router()
const authController = require("../controllers/auth.controller")


/* 
* - user register route
* - POST /api/v1/auth/register
*/
router.post("/register", authController.userRegisterController)

/* 
* - user login route
* - POST /api/v1/auth/login
*/
router.post("/login", authController.userLoginController)



/**
 * - POST /api/auth/logout
 */

router.post("/logOut", authController.userLogoutController)


module.exports = router