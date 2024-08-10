import mongoose, {Schema} from "mongoose";


const TankSchema = new Schema({
    user : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },

    client:{
        type : String,
        trim : true,
    },

    loc:{
        type : String,
        trim : true,
    },

    node:{
        type : String,
        trim : true,
    },

    tankName:{
        type : String,
        trim : true,
    },

    mac:{
        type : String,
        trim : true,
    },

    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },

    deleted: { 
        type: Boolean, 
        enum: [true, false], 
        default: false 
    },

    access : {
        type : Boolean,
        enum: [true, false],
        default : true
    }

}, {timestamps : true})
 

export const Tank = mongoose.model("Tank", TankSchema);