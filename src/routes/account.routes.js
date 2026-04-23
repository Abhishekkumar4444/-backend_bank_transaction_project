const express = require("express")
const middleware = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")

const router = express.Router()


/* *
* - POST api/v1/account/create
* - create a new account
* - Protected routes
*/
router.post("/create", middleware.authMiddleWare, accountController.createAccountController)




/* *
* - GET api/v1/account/list
* - get all list of  accounts
* - Protected routes
*/
router.get("/list", middleware.authMiddleWare, accountController.getUserAccountController)








/* *
* - GET api/v1/account/balance/:accountId
* - get balance
* - Protected routes
*/
router.get("/balance/:accountId", middleware.authMiddleWare, accountController.getUserAccountBalanceController)





module.exports = router