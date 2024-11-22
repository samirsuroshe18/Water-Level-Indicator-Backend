import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const staticPath = path.join(__dirname, '../public');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));

// this use for cross origin sharing 

/*

Credentials in CORS requests: When you include withCredentials: true in the request (either in Axios or Fetch), 
the browser requires the server to specify the exact allowed origin in the Access-Control-Allow-Origin header, 
rather than allowing all origins with *.

CORS Policy with credentials: The server cannot respond with Access-Control-Allow-Origin: * 
when the request is made with credentials. You must explicitly specify the allowed origin in the CORS configuration.

*/

app.use(cors({ origin: [process.env.LIMIT_FLOW_DOMAIN, process.env.CORS_ORIGIN], credentials: true }));
// this middleware use for parsing the json data
app.use(express.json());
// this is used for parsing url data extended is used for nessted object
app.use(express.urlencoded({ extended: true }));
// this is used for accessing public resources from server
app.use(express.static(staticPath));
// this is used to parse the cookie
app.use(cookieParser());

// routes import
import userRouter from './routes/user.routes.js';
import emailRouter from './routes/email.routes.js';
import tankRouter from './routes/tank.routes.js';
import tankUsersRouter from './routes/tankUsers.routes.js';
import accessTankRouter from './routes/accessTank.routes.js';
import limitFlowRouter from './routes/limitFlow.routes.js';

//Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", emailRouter);
app.use("/api/v1/tank", tankRouter);
app.use("/api/v1/tank-users", tankUsersRouter);
app.use("/api/v1/access-tank", accessTankRouter);
app.use("/api/v1/limit-flow", limitFlowRouter);

// Custom error handeling
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return res.status(statusCode).json({
    statusCode: statusCode,
    message: message
  });
})

export default app