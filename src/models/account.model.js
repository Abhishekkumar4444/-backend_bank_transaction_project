const mongoose = require("mongoose")
const ledgerModel = require("./ledger.model")

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Account must be associated with user"],
        index: true,
    },
    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FROZEN", "CLOSED"],
            message: "Status can either be ACTIVE, FROZEN or CLOSED",
        },
        default: "ACTIVE",
    },
    currency:{
        type:String,
        required:[true,"Currency is required for "],
        default:"INR"
    }
   
},{timestamps:true})

// Compound index to speed up queries filtered by both user and status.
accountSchema.index({user:1,status:1})

accountSchema.methods.getBalance = async function(){
    
    const balanceData = await ledgerModel.aggregate([
        // 1) Pick ledger entries belonging to this account only.
        {
            $match: {
                account: this._id
            }
        },
        // 2) Aggregate total credits and total debits separately.
        {
            $group: {
                _id: null,
                totalCredits: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0]
                    }
                },
                totalDebits: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0]
                    }
                }
            }
        },
        // 3) Compute net balance = credits - debits.
        {
            $project: {
                _id: 0,
                balance: { $subtract: ["$totalCredits", "$totalDebits"] }
            }
        }
    ])

    // Never expose negative balance in API responses.
    // Keep minimum visible balance at 0.
    const computedBalance = balanceData[0]?.balance ?? 0
    return Math.max(computedBalance, 0)
}
 


const accountModel = mongoose.model("Account", accountSchema)

module.exports = accountModel


