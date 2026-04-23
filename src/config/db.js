const { default: mongoose } = require("mongoose")

const connectDB = async () => {
    try {
        // Hide internal metadata fields from JSON/object responses.
        mongoose.set("toJSON", {
            versionKey: false,
            transform: (_, ret) => {
                ret.id = ret._id
                delete ret._id
                delete ret.__v
                return ret
            },
        })
        mongoose.set("toObject", {
            versionKey: false,
            transform: (_, ret) => {
                ret.id = ret._id
                delete ret._id
                delete ret.__v
                return ret
            },
        })

        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}



module.exports = connectDB