const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: [true, "Email already exists"],
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"],
        select: false,
    },

    systemUser:{
        type:Boolean,
        default:false,
        immutable:true,
        select:false
    }
}, { timestamps: true })

// Hashes the password before saving when it has been changed.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return
    const hashedPassword = await bcrypt.hash(this.password, 10)
    this.password = hashedPassword
})

// Compares a plain password with the stored hashed password.
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

const User = mongoose.model("User", userSchema)

module.exports = User