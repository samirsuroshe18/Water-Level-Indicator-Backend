import express from "express";
import cors from 'cors'
import cookieParser from "cookie-parser";

const app = express();

// database name --> youtubedb

// this use for cross origin sharing 
app.use(cors({ origin: process.env.CORS_ORIGIN}))
// this middleware use for parsing the json data
app.use(express.json())
// this is used for parsing url data extended is used for nessted object
app.use(express.urlencoded({extended: true}))
// this is used for accessing public resources from server
app.use(express.static("public"))
// this is used to parse the cookie
app.use(cookieParser());

// routes import
import userRouter from './routes/user.routes.js'
import otpRouter from './routes/otp.routes.js'

//Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRouter);
  
// Custom error handeling
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
      
        return res.status(statusCode).json({
          status : statusCode,
          message : message
        });
      
  })

export default app