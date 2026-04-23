const transactionModel = require("../models/transaction.model")
const accountModel = require("../models/account.model")
const { default: mongoose } = require("mongoose")
const ledgerModel = require("../models/ledger.model")

const isReplicaSetTransactionError = (error) =>
  error?.message?.includes("Transaction numbers are only allowed on a replica set member or mongos")


/**
* - Create a new transaction
* THE 10-STEP TRANSFER FLOW:
* 1. Validate request
* 2. Validate idempotency key
* 3. Check account status
* 4. Derive sender balance from ledger
* 5. Create transaction (PENDING)
* 6. Create DEBIT ledger entry
* 7. Create CREDIT ledger entry
* 8. Mark transaction COMPLETED
* 9. Commit MongoDB session
* 10. Send email notification
*/

const createTransactionController = async (req,res) => {

/* *
 * 1. Validate Request 
*/

  const {fromAccount, toAccount, amount, idempotencyKey} = req?.body

  const requiredKeys = ["fromAccount", "toAccount", "amount", "idempotencyKey"]
  const missingKeys = requiredKeys.filter((key) => {
    const value = req.body?.[key]
    return value === undefined || value === null || value === ""
  })

  if (missingKeys.length) {
    return res.status(400).json({
      message: `Missing required key(s): ${missingKeys.join(", ")}`
    })
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount
  })
  const toUserAccount = await accountModel.findOne({
    _id: toAccount
  })

  const invalidAccounts = []
  if (!fromUserAccount) invalidAccounts.push("fromAccount")
  if (!toUserAccount) invalidAccounts.push("toAccount")

  if (invalidAccounts.length) {
    return res.status(400).json({
      message: `Invalid account(s): ${invalidAccounts.join(", ")}`
    })
  }


  /* * 
  *  2. Validate idempotency key
  */
  
  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey
  })

  if (isTransactionAlreadyExists) {
    const statusResponseMap = {
      COMPLETED: {
        statusCode: 200,
        message: "Transaction already completed."
      },
      PENDING: {
        statusCode: 409,
        message: "Transaction is still pending."
      },
      FAILED: {
        statusCode: 409,
        message: "Previous transaction was failed,please retry."
      },
      REVERSED: {
        statusCode: 409,
        message: "Previous transaction was reversed, please retry."
      }
    }

    const statusConfig = statusResponseMap[isTransactionAlreadyExists.status] || {
      statusCode: 409,
      message: `Transaction already exists with status: ${isTransactionAlreadyExists.status}`
    }

    return res.status(statusConfig.statusCode).json({
      message: statusConfig.message,
      transactionId: isTransactionAlreadyExists._id,
      status: isTransactionAlreadyExists.status
    })
  }

  /* *
  *  3. Check account status
  */

  if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
    return res.status(400).json({
      message:"Both fromAccount and toAccount must be ACTIVE to process transaction"
    })
  }

   /* *
   *  4. Derive sender balance from ledger
   */


   const balance = await fromUserAccount.getBalance()
   if(balance < amount){
     return res.status(400).json({
      message: `Insufficient balance. current balace is ${balance}. Requested amount is ${amount}`
     })
   }

  /* *
   *  5. Create transaction (PENDING)
   */

  const session = await mongoose.startSession()
  try {
    session.startTransaction()
  
    const [transaction] = await transactionModel.create([{
      fromAccount,
      toAccount,
      amount,
      idempotencyKey,
      status : "PENDING",
    }],{session})

    await ledgerModel.create([{
      account:fromAccount,
      amount,
      transaction: transaction?._id,
      type:"DEBIT"
    }],{session})

    await ledgerModel.create([{
      account:toAccount,
      amount,
      transaction: transaction?._id,
      type:"CREDIT"
    }],{session})

    transaction.status = "COMPLETED"
    await transaction.save({session})

    await session.commitTransaction()

    return res.status(200).json({
      message:"Initial transaction completed sucessfully",
      transaction
    })
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    if (isReplicaSetTransactionError(error)) {
      const transaction = await transactionModel.create({
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING",
      })

      await ledgerModel.create({
        account: fromAccount,
        amount,
        transaction: transaction?._id,
        type: "DEBIT",
      })

      await ledgerModel.create({
        account: toAccount,
        amount,
        transaction: transaction?._id,
        type: "CREDIT",
      })

      transaction.status = "COMPLETED"
      await transaction.save()

      return res.status(200).json({
        message: "Initial transaction completed successfully (without DB transaction).",
        transaction,
      })
    }

    return res.status(500).json({
      message: "Failed to create transaction",
      error: error?.message
    })
  } finally {
    session.endSession()
  }

}

const createInitialFundsTransaction = async (req,res)=>{

  const {toAccount, amount, idempotencyKey} = req?.body

  const initialTransactionskey = ["toAccount", "amount", "idempotencyKey"]

  const missingInitialTransactionskey = initialTransactionskey.filter((key) => {
    const value = req.body?.[key]
    return value === undefined || value === null || value === ""
  })

  if (missingInitialTransactionskey?.length) {
    return res.status(400).json({
      message: `Missing required key(s): ${missingInitialTransactionskey.join(", ")}`
    })
  }

  const fromUserAccount = await accountModel.findOne({
   user:req.user?._id
  })

  
  if (!fromUserAccount) {
    return res.status(400).json({
      message: `System user account not found.`
    })
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()
  
    const transaction = new transactionModel({
      fromAccount: fromUserAccount?._id,
      toAccount,
      amount,
      idempotencyKey,
      session
    })

    await ledgerModel.create([{
      account:fromUserAccount?._id,
      amount,
      transaction: transaction?._id,
      type:"DEBIT"
    }],{session})

    await ledgerModel.create([{
      account:toAccount,
      amount,
      transaction: transaction?._id,
      type:"CREDIT"
    }],{session})

    transaction.status = "COMPLETED"
    await transaction.save({session})

    await session.commitTransaction()

    return res.status(200).json({
      message:"Initial fund transaction completed sucessfully",
      transaction
    })
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }

    if (isReplicaSetTransactionError(error)) {
      const transaction = await transactionModel.create({
        fromAccount: fromUserAccount?._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
      })

      await ledgerModel.create({
        account: fromUserAccount?._id,
        amount,
        transaction: transaction?._id,
        type: "DEBIT"
      })

      await ledgerModel.create({
        account: toAccount,
        amount,
        transaction: transaction?._id,
        type: "CREDIT"
      })

      transaction.status = "COMPLETED"
      await transaction.save()

      return res.status(200).json({
        message: "Initial fund transaction completed successfully (without DB transaction).",
        transaction
      })
    }

    return res.status(500).json({
      message: "Failed to create initial fund transaction",
      error: error?.message
    })
  } finally {
    session.endSession()
  }

}

module.exports = {
  createTransactionController,
  createInitialFundsTransaction
}