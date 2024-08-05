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
        throw new ApiError(401, "Invalid tank key or tank doesn't exists");
    }

    if(tankExists && !tankExists.access){
        throw new ApiError(401, "Access is denied");
    }

    if(tankExists.user.toString() !== req.user._id.toString() && tankExists.role === "admin"){
        throw new ApiError(401, "Access is denied");
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
});


const getTank = asyncHandler(async (req, res)=>{
    const conn = await connectMysql();
    try{
        const tanks = await Tank.find({ 
            user: req.user._id, 
            deleted: false,
            access: true
          }).select("-createdAt -updatedAt -__v");
    
        if (!tanks || tanks.length <= 0) {
            throw new ApiError(404, 'No tank data found.');
        }
        
        const tankDataPromises = tanks.map(async (tank) => {
            const sqlQuery = `SELECT id, node, d1, d2, dtime, client, loc, mac FROM waterSensorData WHERE loc = ? AND client = ? AND node = ? AND mac = ? ORDER BY id DESC LIMIT 1`;
            const params = [tank.loc, tank.client, tank.node, tank.mac];
            
            const [rows] = await conn.execute(sqlQuery, params);

            const deviceDate = new Date(rows[0].dtime.replace(' ', 'T'));
                const differenceInMs = new Date() - deviceDate;
                const differenceInMinutes = differenceInMs / 1000 / 60;
                let status = differenceInMinutes > 5 ? "Offline" : "Online";

            return {
                _id: tank._id,
                user: tank.user,
                ...rows[0] || null,
                status
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
        throw new ApiError(404, 'No Register Device found.');
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
        const sqlQuery1 = `SELECT DISTINCT client FROM device_info`;
        const [rows] = await conn.execute(sqlQuery1);

        const data = rows.map((data)=>{
            return data.client;
        });

        const unwantedElements = [null, "Test", "Test 3", "Test5", "Test 7, Fern"];
        const filteredData = data.filter(item => !unwantedElements.includes(item));

        return res.status(200).json(
            new ApiResponse(200, filteredData, "Tank clients fetched successfully")
        );
    }finally{
        conn.release();
    }
});


const getAllClientTanks = asyncHandler(async (req, res) => {
    const {clientName} = req.body;
    const conn = await connectMysql();
    
    try {
        const sqlQuery1 = `SELECT * FROM device_info WHERE client = ?`;
        const params = [clientName];
        const [rows] = await conn.execute(sqlQuery1, params);
        
        const tankPromises = rows.map(async (tank) => {
            const sqlQuery = `SELECT client, loc, node, d1, d2, dtime, mac FROM waterSensorData WHERE node = ? AND mac = ? AND client = ? ORDER BY id DESC LIMIT 1`;
            const params = [tank.node, tank.mac, tank.client];
            const [queryResults] = await conn.execute(sqlQuery, params);

            if (queryResults.length <= 0) {
                return null;
            }

            const dtime = queryResults[0].dtime;
            let status = "Offline";

            if (dtime) {
                const deviceDate = new Date(dtime.replace(' ', 'T'));
                const differenceInMs = new Date() - deviceDate;
                const differenceInMinutes = differenceInMs / 1000 / 60;
                status = differenceInMinutes > 5 ? "Offline" : "Online";
            }

            const addedByUser = await Tank.findOne({ client: tank.client, node: tank.node, mac: tank.mac }).exec();

            return {
                ...queryResults[0],
                status,
                registerOnApp: !!addedByUser,
                access: addedByUser ? addedByUser.access : null,
                startDate: tank.start_time,
            };
        });
        
        const results = (await Promise.all(tankPromises)).filter(result => result !== null);

        if (results.length <= 0) throw new ApiError(401, "No Tank Found");

        return res.status(200).json(
            new ApiResponse(200, results, "All Tanks fetched successfully")
        );
    
    } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
    } finally {
        conn.release();
    }
});


const deleteTankFromAdmin = asyncHandler(async (req, res)=>{
    const {client, node, mac} = req.body;
    const tank = await Tank.findOne({client, node, mac});
    if(!tank){
        throw new ApiError(401, "Tank Does not exists");
    }
    const isTankDel = await Tank.deleteMany({_id:tank._id});
    const isUserDel = await TankUser.deleteMany({tank:tank._id});
    const isAccessTankDel = await AccessTank.deleteMany({ tank: tank._id });
    if(!isTankDel && !isUserDel && !isAccessTankDel){
        throw new ApiError(401, "Failed");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Device deleted successfully")
    )
});


const tankAccessFromAdmin = asyncHandler(async (req, res)=>{
    const {client, node, mac} = req.body;
    const isDel = await Tank.findOneAndUpdate({client, node, mac}, [
        { $set: { access: { $cond: { if: "$access", then: false, else: true } } } } // Toggle the boolean field
    ],);

    if(!isDel){
        throw new ApiError(401, "Tank Does not exist");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Device access modified successfully")
    );
});


const addNewTable = asyncHandler(async(req, res)=>{
    const conn = await connectMysql();
    try{
        const sqlQuery1 = `SELECT DISTINCT client FROM device_info`;
        const [rows1] = await conn.execute(sqlQuery1);
        const table1 = rows1.map((data)=>{
            return data.client;
        });
    
        const sqlQuery2 = `SELECT DISTINCT client FROM waterSensorData`;
        const [rows2] = await conn.execute(sqlQuery2);
        const table2 = rows2.map((data)=>{
            return data.client;
        });
    
        const unique = table2.filter(item => !table1.includes(item));
        const unwantedElements = [null];
        const filteredData = unique.filter(item => !unwantedElements.includes(item));

        console.log(filteredData);

        const tankPromises1 = filteredData.map(async (item)=>{
            const sqlQuery3 = `SELECT DISTINCT node, mac, client FROM waterSensorData WHERE client = ?`;
            const params = [item];
            const [rows] = await conn.execute(sqlQuery3, params);
            return rows
        })

        const tank = await Promise.all(tankPromises1);
        let tankPromises = [];

        // Collect all promises
        for (let i = 0; i < tank.length; i++) {
            const promises = tank[i].map(async (tankItem) => {
                const sqlQuery = `SELECT client, node, mac, reading_time FROM waterSensorData WHERE node = ? AND mac = ? AND client = ? ORDER BY reading_time ASC LIMIT 1`;
                const params = [tankItem.node, tankItem.mac, tankItem.client];
                const [rows] = await conn.execute(sqlQuery, params);
                return rows[0] || null;
            });
        
            // Add the promises of the current array to the tankPromises array
            tankPromises.push(...promises);
        }

        // Execute all promises and get the results
        const results = await Promise.all(tankPromises);

        // Insert data into table
        const sql = `INSERT INTO device_info (client, node, mac, start_time) VALUES ?`;
        const values = results.map(item => [item.client, item.node, item.mac, item.reading_time]);

        conn.query(sql, [values], (error, results) => {
        if (error) throw error;
        console.log('Data inserted:', results);
        });
    
        res.status(200).json(
            new ApiResponse(200, {}, "success")
        )
    }finally{
        conn.release();
    }
});


export{registerTank, getRegisteredTank, addTank, getTank, removeTank, getAllClientTanks, getAllClients, deleteTankFromAdmin, tankAccessFromAdmin, addNewTable}