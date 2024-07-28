import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import mongoose from 'mongoose';
import { TankUser } from '../models/tankUsers.model.js';
import { AccessTank } from '../models/accessTank.model.js';
import { connectMysql } from '../database/database.js';


const addAccessTank = asyncHandler(async (req, res) =>{
    const {tank} = req.body;
    const tankId = mongoose.Types.ObjectId.createFromHexString(tank);
    const userId = req.user._id;
    
    const tankExists = await TankUser.findById(tankId);

    if(!tankExists){
        throw new ApiError(401, "Invalid tank key");
    }

    if(tankExists.user.toString() !== userId.toString()){
        throw new ApiError(401, "Access denied");
    }

    const accessTankExists = await AccessTank.findOne({ 
        user: userId, 
        tank: tankExists.tank,
        admin: tankExists.admin
    });

    if(accessTankExists){
        throw new ApiError(400, "Tank is already added");
    }

    const tankUser = await AccessTank.create({
        tankUserId: tankId,
        user: userId,
        admin: tankExists.admin,
        tank: tankExists.tank
    });

    if(!tankUser){
        throw new ApiError(500, "Something went wrong!!");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Tank Added successfully")
    );
});


const getAccessTank = asyncHandler(async (req, res) =>{
    const conn = await connectMysql();
    try{

        const userId = req.user._id;

        const tanks = await AccessTank.aggregate([
            {
                $match: {
                    user : userId
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "admin",
                    foreignField: "_id",
                    as: "admin",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                userName: 1,
                                email: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    admin: {
                        $first: "$admin"
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                userName: 1,
                                email: 1,
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    user: {
                        $first: "$user"
                    }
                }
            },
            {
                $lookup: {
                    from: "tanks",
                    localField: "tank",
                    foreignField: "_id",
                    as: "tank",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                client: 1,
                                loc: 1,
                                node: 1,
                                mac: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    tank: {
                        $first: "$tank"
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    admin: 1,
                    user: 1,
                    tank : 1
                }
            }
        ]);
    
        if (!tanks || tanks.length <= 0) {
            throw new ApiError(404, 'No tank found.');
        }
    
        const tankDataPromises = tanks.map(async (tank) => {
            const sqlQuery = `SELECT id, node, d1, d2, dtime, client, loc, mac FROM waterSensorData WHERE loc = ? AND client = ? AND node = ? AND mac = ? ORDER BY id DESC LIMIT 1`;
            const params = [tank.tank.loc, tank.tank.client, tank.tank.node, tank.tank.mac];
            
            const [rows] = await conn.execute(sqlQuery, params);
            return {
                _id: tank._id,
                admin: tank.admin,
                ...rows[0] || null,
            }
          });
    
        const tankData = await Promise.all(tankDataPromises);
    
        return res.status(200).json(
            new ApiResponse(200, tankData, "Tank fetched successfully")
        );
    
    }finally{
        conn.release();
    }
});


const removeAccessTank = asyncHandler(async (req, res) => {
    const {tank} = req.body;
    const tankId = mongoose.Types.ObjectId.createFromHexString(tank);

    const tankExists = await AccessTank.findById(tankId);

    if(!tankExists){
        throw new ApiError(401, "Invalid tank id");
    }

    if(tankExists.user.toString() !== req.user._id.toString()){
        throw new ApiError(401, "Access denied");
    }

    const tankUser = await AccessTank.findByIdAndDelete(tankId);

    if (!tankUser) {
        throw new ApiError(404, "deletion failed");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Tank deleted successfully")
    );
})


export{addAccessTank, getAccessTank, removeAccessTank}