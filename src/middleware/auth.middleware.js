const jwt = require("jsonwebtoken")
const UserModel = require("../models/user.model")

async function authMiddleWare(req,res,next){
    const token = req?.cookies?.token || req?.headers?.authorization?.split(" ")[1]

    if(!token){
        return res.status(401).json({
            message: "Unauthorized access, token is missing."
        })
    }
    try{
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

        const user  =  await UserModel.findById(decodedToken?.userId)

        req.user = user

        return next()


    }catch(err){
        return res.status(401).json({
            message: "Unauthorized access, token is missing."
        }) 
    }
}
async function authSystemUserMiddleWare(req,res,next){
    const token = req?.cookies?.token || req?.headers?.authorization?.split(" ")[1]

    if(!token){
        return res.status(401).json({
            message: "Unauthorized access, token is missing."
        })
    }
    try{
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

        const user  =  await UserModel.findById(decodedToken?.userId).select("+systemUser")

        if(!user?.systemUser){
            return res.status(403).json({
                message: "Forbidden Acess, not a system user."
            })
        }

        req.user = user

        return next()


    }catch(err){
        return res.status(401).json({
            message: "Unauthorized access, token is missing."
        }) 
    }
}

module.exports = {
    authMiddleWare,
    authSystemUserMiddleWare
}