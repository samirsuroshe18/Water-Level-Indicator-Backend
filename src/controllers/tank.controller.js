import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import mongoose from 'mongoose';
import { Tank } from '../models/tank.model.js';
import { TankUser } from '../models/tankUsers.model.js';
import { AccessTank } from '../models/accessTank.model.js';
import { connectMysql } from '../database/database.js';

const registerTank = asyncHandler(async (req, res) => {
    const conn = await connectMysql();
    try{
        const {client, loc, node, mac} = req.body;

        if(!client?.trim() || !loc?.trim() || !node?.trim() || !mac?.trim()){
            throw new ApiError(400, "Please enter credential");
        }
    
        const user = req.user._id;
        const existingTank = await Tank.findOne({ client, loc, node, mac });
    
        if(existingTank){
            if(existingTank.user.toString() === user.toString() && existingTank.role === "admin"){
                throw new ApiError(400, "Tank is already registered");
            }else{
                throw new ApiError(403, "Access denied");
            }
        }
    
        const query = `SELECT * FROM waterSensorData WHERE mac = ? AND loc = ? AND client = ? AND node = ? LIMIT 1;`;
        const [results] = await conn.execute(query, [mac, loc, client, node]);
    
        if (!results || results.length <= 0) {
            throw new ApiError(401, "Invalid credentials or tank not found");
        }
    
        const tank = await Tank.create({
            user,
            client,
            loc,
            node,
            mac,
        });
    
        if(!tank){
            throw new ApiError(500, "Something went wrong!!");
        }
    
        return res.status(200).json(
            new ApiResponse(200, {}, "Tank Added successfully")
        );
    
    }finally{
        conn.release();
    }
});


const addTank = asyncHandler(async (req, res) =>{
    const {tank} = req.body;
    const tankId = mongoose.Types.ObjectId.createFromHexString(tank);

    const tankExists = await Tank.findById(tankId);

    if(!tankExists){
        throw new ApiError(401, "Invalid tank key");
    }

    if(tankExists.user.toString() !== req.user._id.toString() && tankExists.role === "admin"){
        throw new ApiError(401, "Access denied");
    }

    if(tankExists.deleted === false){
        throw new ApiError(400, "Tank is already added");
    }

    const update = { deleted: false };
    const updatedTank = await Tank.findByIdAndUpdate(tankId, update, { new: true });

    if (!updatedTank) {
        throw new ApiError(404, "failed to add a tank");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Tank Added successfully")
    );
})


const getTank = asyncHandler(async (req, res)=>{
    const conn = await connectMysql();
    try{
        const tanks = await Tank.find({ 
            user: req.user._id, 
            deleted: false
          }).select("-createdAt -updatedAt -__v");
    
        if (!tanks || tanks.length <= 0) {
            throw new ApiError(404, 'No tank data found.');
        }
        
        const tankDataPromises = tanks.map(async (tank) => {
            const sqlQuery = `SELECT id, node, d1, d2, dtime, client, loc, mac FROM waterSensorData WHERE loc = ? AND client = ? AND node = ? AND mac = ? ORDER BY id DESC LIMIT 1`;
            const params = [tank.loc, tank.client, tank.node, tank.mac];
            
            const [rows] = await conn.execute(sqlQuery, params);
            return {
                _id: tank._id,
                user: tank.user,
                ...rows[0] || null,
            }
        });
      
        const tankData = await Promise.all(tankDataPromises);
    
        return res.status(200).json(
            new ApiResponse(200, tankData, "Tank data fetched successfully")
        );
    
    }finally{
        conn.release();
    }
});


const getRegisteredTank = asyncHandler(async (req, res)=>{

    const tanks = await Tank.find({ 
        user: req.user._id,
      }).select("-createdAt -updatedAt -__v");

    if (!tanks || tanks.length <= 0) {
        throw new ApiError(404, 'No tank data found.');
    }

    return res.status(200).json(
        new ApiResponse(200, tanks, "Tank fetched successfully")
    );
});


const removeTank = asyncHandler(async (req, res)=>{
    const {tank} = req.body;
    const tankId = mongoose.Types.ObjectId.createFromHexString(tank);
    const userId = req.user._id;
    const tankExists = await Tank.findById(tankId);

    // Check if tank exists
    if (!tankExists) {
      throw new ApiError(401, "Invalid tank key");
    }
  
    // Perform a soft delete by setting the `deleted` field to true
    tankExists.deleted = true;
    const result1 = await tankExists.save();

    const result2 = await TankUser.deleteMany({ tank: tankId });
    const result3 = await AccessTank.deleteMany({ tank: tankId });

    if(!result1 && !result2 && result3){
        throw new ApiError(401, "delete operation is failed");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Tank deleted successfully")
    );
});


const getAllClients = asyncHandler(async (req, res)=>{
    const conn = await connectMysql();
    try{
        const sqlQuery1 = `SELECT DISTINCT client FROM waterSensorData`;
        const [rows] = await conn.execute(sqlQuery1);

        return res.status(200).json(
            new ApiResponse(200, rows, "Tank clients fetched successfully")
        );
    }finally{
        conn.release();
    }
});


const getAllClientTanks = asyncHandler(async (req, res)=>{
    const clientName = req.query.clientName;
    const conn = await connectMysql();
    try{    
        const sqlQuery1 = `SELECT DISTINCT node, mac, client FROM waterSensorData WHERE client = ?`;
        const params = [clientName];
        const [rows] = await conn.execute(sqlQuery1, params);
        
        const tankPromises = rows.map(async (tank) => {
            const sqlQuery = `SELECT client, loc, node, d1, dtime, mac FROM waterSensorData WHERE node = ? AND mac = ? AND client = ? ORDER BY id DESC limit 1`;
            const params = [tank.node, tank.mac, tank.client];
            
            const [rows] = await conn.execute(sqlQuery, params);
            return {
                ...rows[0] || null,
            }
        });

        const tankDataPromises = rows.map(async (tank) => {

            const sqlQuery2 = `SELECT reading_time FROM waterSensorData WHERE node = ? AND mac = ? AND client = ? ORDER BY id ASC limit 1`;
            const params2 = [tank.node, tank.mac, tank.client];
            
            const [rows] = await conn.execute(sqlQuery2, params2);
            return {
                ...rows[0] || null,
            }
        });
      
        const tank = await Promise.all(tankPromises);
        const tankData = await Promise.all(tankDataPromises);

        const mergedArr = tank.map((item, index) => {
           return {
            ...item,
            startDate : tankData[index].reading_time
           }
          });

        return res.status(200).json(
            new ApiResponse(200, mergedArr, "Tank clients fetched successfully")
        );
    
    }finally{
        conn.release();
    }
});


export{registerTank, getRegisteredTank, addTank, getTank, removeTank, getAllClientTanks, getAllClients}