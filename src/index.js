import dotenv from "dotenv"
dotenv.config()
import connectDB, { connectMysql } from "./database/database.js";
import app from "./app.js";

let conn;
connectDB().then(()=>{
    app.listen(process.env.PORT || 8000, process.env.SERVER_HOST, async ()=>{
        conn = await connectMysql();
        console.log(`Server is running at on : http://${process.env.SERVER_HOST}:${process.env.PORT}`);
    })
}).catch((err)=>{
    console.log('MongoDB Failed !!!', err);
});


export{conn}