import mongoose from "mongoose";
import mysql from "mysql2/promise";

const connectMysql = async () => {
    try {
        const conn = mysql.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DB,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const connection = await conn.getConnection();
        console.log("Connection is establish");
        return connection;
    } catch (error) {
        console.error("MySQL connection error:", error);
        process.exit(1);
    }
};

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB connected !! DB Host : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("mogoDB connection Error : ", error);
        process.exit(1);
    }
}

export default connectDB 
export{connectMysql}