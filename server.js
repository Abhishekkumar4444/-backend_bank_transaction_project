const app  = require("./src/app")
const connectDB = require("./src/config/db")

require("dotenv").config()

const port = process.env.PORT

connectDB()

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`)
})