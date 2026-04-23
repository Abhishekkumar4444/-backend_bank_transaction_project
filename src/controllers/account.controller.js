const accountModel = require("../models/account.model")


/* *

* - create account controller
* - - POST /api/v1/account/create
*/

const createAccountController = async (req,res) => {
  try {
    const user = req.user
    const account = await accountModel.create({
      user:user._id
    })
    return res.status(201).json({
      account
    })
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create account",
      error: error?.message
    })
  }
}

const getUserAccountController = async (req,res) => {
  try {
    const user = req.user
    const accounts = await accountModel.find({
      user:user._id
    })

    return res.status(200).json({
      accounts
    })
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch accounts",
      error: error?.message
    })
  }
}
const getUserAccountBalanceController = async (req,res) => {
  try {
    const {accountId}  = req.params
    const user = req.user
    const account = await accountModel.findOne({
      user:user._id,
      _id:accountId
    })

    if(!account){
      return res.status(404).json({
        message:"Account not found"
      })    
    }

    const balance = await account.getBalance()

    return res.status(200).json({
      accountId: account._id,
      balance
    })
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch account balance",
      error: error?.message
    })
  }
}

module.exports = {
    createAccountController,
    getUserAccountController,
    getUserAccountBalanceController
}