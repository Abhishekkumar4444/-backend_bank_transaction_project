const express = require("express")
const middleware = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const router = express.Router()


/* *
* - POST api/v1/transaction
* - create a new transaction
* - Protected routes
*/
router.post("/", middleware.authMiddleWare, transactionController.createTransactionController)
router.post("/system/initial-funds", middleware.authSystemUserMiddleWare, transactionController.createInitialFundsTransaction)


module.exports = router