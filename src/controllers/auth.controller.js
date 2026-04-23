const tokenBlackListModel = require("../models/blackList.model");
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken")


/** 
* - user register controller
* - POST /api/v1/auth/register

*/

async function userRegisterController(req,res){
    const {name,email,password} =  req.body
    if(!name || !email || !password){
        return res.status(422).json({status:"failed", message: "All fields are required."})
    }
    const isEmailExists = await userModel.findOne({email})

    if(isEmailExists){
        return res.status(422).json({status:"failed", message: "Email already exists."})
    }
    const user = await userModel.create({name,email,password})
    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "1d"})
    // Sends/set JWT in a cookie as set cookie: httpOnly blocks JS access, secure sends only over HTTPS, maxAge is 1 day.
    // res.cookie("token", token, {httpOnly: true, secure: true, maxAge: 1000 * 60 * 60 * 24})
    res.cookie("token", token)
    const { password: _password, ...safeUser } = user.toObject()

    return res.status(201).json({
        status: "success",
        message: "User registered successfully.",
        user: safeUser,
        token: token,
    })
}

/** 
* - user login controller
* - POST /api/v1/auth/login
*/
async function userLoginController(req,res){
    const {email,password} = req.body
    if(!email || !password){
        return res.status(422).json({status:"failed", message: "All fields are required."})
    }
    const user = await userModel.findOne({email}).select("+password")
    if(!user){
        return res.status(401).json({status:"failed", message: "Invalid email or password."})
    }

    const isPasswordMatch = await user.comparePassword(password)

    if(!isPasswordMatch){
        return res.status(401).json({status:"failed", message: "Invalid email or password."})
    }
    // Sends/set JWT in a cookie as set cookie: httpOnly blocks JS access, secure sends only over HTTPS, maxAge is 1 day.
    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "1d"})
    res.cookie("token", token, {httpOnly: true, secure: true, maxAge: 1000 * 60 * 60 * 24})
    const { password: _password, ...safeUser } = user.toObject()


    return res.status(200).json({status:"success", message: "User logged in successfully.", user: safeUser, token: token})
}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })

}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}