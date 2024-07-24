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

    mac:{
        type : String,
        trim : true,
    },

    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'admin' 
    },

}, {timestamps : true})
 

export const Tank = mongoose.model("Tank", TankSchema);