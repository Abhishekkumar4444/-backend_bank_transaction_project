const mongoose = require("mongoose")


const ledgerSchema = new mongoose.Schema({

    account:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"account",
        required:[true, "Ledger must be associated with an account"],
        index:true,
        immutable:true
    },
    amount:{
        type:Number,
        required:[true, "Amount is required for creating a ledger entry"],
        immutable:true

    },
    transaction:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"transaction",
        required:[true, "Ledger must be associated with a transaction"],
        index:true,
        immutable:true

    },
    type:{
        type:String,
        enum:{
            values: ["CREDIT", "DEBIT"],
            message: "Type can be either  CREDIT or DEBIT",
        },
        required:[true, "Ledger type is required"],
        immutable:true

    },
}, {timestamps:true})

// Allow 2 ledger rows per transaction (one DEBIT + one CREDIT),
// but prevent duplicates of the same type for the same transaction.
ledgerSchema.index({ transaction: 1, type: 1 }, { unique: true })


// Centralized guard used by mutation hooks to reject edits on posted ledger entries.
function preventLedgerModification(){
    throw new Error("Ledger entries are immutable and cannot be modified or deleted")
}

const BLOCKED_LEDGER_MUTATION_HOOKS = Object.freeze([
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
    "findOneAndReplace",
    "findOneAndDelete",
    "deleteOne",
    "deleteMany",
    "remove",
])

// Ledger can be created, but it cannot be updated or deleted.
function registerMutationGuards(schema, hooks, guard){
    hooks.forEach((hook) => schema.pre(hook, guard))
}

registerMutationGuards(ledgerSchema, BLOCKED_LEDGER_MUTATION_HOOKS, preventLedgerModification)



const ledgerModel = mongoose.model("ledger", ledgerSchema)

module.exports = ledgerModel