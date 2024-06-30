import dotenv from "dotenv"
dotenv.config()
import connectDB from "./database/database.js";
import app from "./app.js";


connectDB().then(()=>{
    app.listen(process.env.PORT || 8000, process.env.SERVER_HOST, ()=>{
        console.log(`Server is running at on : https://${process.env.SERVER_HOST}:${process.env.PORT}`);
    })
}).catch((err)=>{
    console.log('MongoDB Failed !!!', err);
});