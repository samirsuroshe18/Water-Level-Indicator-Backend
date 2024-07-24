import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
import { Tank } from '../models/tank.model.js';
import { conn } from '../index.js';
import { TankUser } from '../models/tankUsers.model.js';

const addTank = asyncHandler(async (req, res) => {
    const {client, loc, node, mac} = req.body;

    if(!client?.trim() || !loc?.trim() || !node?.trim() || !mac?.trim()){
        throw new ApiError(400, "Please enter credential");
    }

    const user = req.user._id;
    const existingTank = await Tank.findOne({ client, loc, node, mac });

    if(existingTank){
        if(existingTank.user === user){
            throw new ApiError(400, "Tank is already added");
        }else{
            throw new ApiError(403, "Access denied");
        }
    }

    const query = `SELECT * FROM waterSensorData WHERE mac = ? AND loc = ? AND client = ? AND node = ? ORDER BY id DESC LIMIT 1;`;
    const [results] = await conn.execute(query, [mac, loc, client, node]);

    if (results.length === 0) {
        throw new ApiError(401, "Invalid credentials or tank not found");
    }

    const tank = await Tank.create({
        user,
        client,
        loc,
        node,
        mac,
        role : 'admin'
    });

    const tankUser = await TankUser.create({
        user,
        admin: user,
        tank: tank._id
    });

    if(!tankUser){
        throw new ApiError(500, "Something went wrong!!");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Tank Added successfully")
    );
});


const getTank = asyncHandler(async (req, res)=>{

    const tanks = await TankUser.find({ user: req.user._id }).select("-createdAt -updatedAt -__v").exec();

    if (!tanks || tanks.length < 0) {
        throw new ApiError(404, 'No tank found for this user.');
    }
    console.log("check karude mala : ", tanks);
    // Extract tank IDs from the tankUserRecords
    const tankIds = tanks.map(record => record.tank);

    // Fetch tank details based on the array of tank IDs
    const tankData = await Tank.find({ _id: { $in: tankIds } }).select("-createdAt -updatedAt -__v").exec();

    // const tankData = await Tank.find({ _id: tanks[0].tank }).select("-createdAt -updatedAt -__v").exec();

    return res.status(200).json(
        new ApiResponse(200, tankData, "Tank fetched successfully")
    );
})


export{addTank, getTank}