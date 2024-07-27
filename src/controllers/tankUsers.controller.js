import asyncHandler from '../utils/asynchandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
import { Tank } from '../models/tank.model.js';
import { TankUser } from '../models/tankUsers.model.js';
import { AccessTank } from '../models/accessTank.model.js';


const addTankUser = asyncHandler(async (req, res) => {
    const {tank, email} = req.body;
    const tankId = mongoose.Types.ObjectId.createFromHexString(tank);

    const tankExists = await Tank.findOne({ 
        _id: tankId, 
        deleted: false
      });

    if(!tankExists){
        throw new ApiError(401, "Invalid tank key"); 
    }

    const userExists = await User.findOne({ email: email });
    if(!userExists){
        throw new ApiError(401, "Invalid eamil"); 
    }

    const existingUser = await TankUser.findOne({ user: userExists._id, tank: tankId });

    if(existingUser){
        throw new ApiError(400, "User is already added");
    }

    const tankUser = await TankUser.create({
        user: userExists._id,
        admin: req.user._id,
        tank: tankId
    });

    if(!tankUser){
        throw new ApiError(500, "Something went wrong!!");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "User Added Successfully")
    );
});

const getTankUser = asyncHandler(async (req, res) => {
    const admin = req.admin._id;

    const response = await TankUser.aggregate([
        {
            $match: {
                admin : admin
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
                from: "users",
                localField: "admin",
                foreignField: "_id",
                as: "admin",
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
                admin: {
                    $first: "$admin"
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

    if (!response || response.length <= 0) {
        throw new ApiError(404, 'No users found.');
    }

    return res.status(200).json(
        new ApiResponse(200, response, "User fetched Successfully")
    );
});

const removeTankUser = asyncHandler(async (req, res) => {
    const {tankUserID} = req.body;

    const tankUserExists = await TankUser.findOne({ _id: mongoose.Types.ObjectId.createFromHexString(tankUserID) });
    if (!tankUserExists) {
        throw new ApiError(404, "Invalid user tank ID"); 
    }

    const tankUser = await TankUser.findOneAndDelete({
        _id: tankUserID
    });

    const tankAccess = await AccessTank.findOneAndDelete({
        tankUserId: tankUserID
    })

    if (!tankUser && !tankAccess) {
        throw new ApiError(500, "Something went wrong");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "User removed successfully")
    );

});


export{addTankUser, removeTankUser, getTankUser}