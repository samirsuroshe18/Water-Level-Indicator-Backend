import mongoose, {Schema} from "mongoose";


const TankUserSchema = new Schema({
    user : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },

    admin : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },

    tank : {
        type : Schema.Types.ObjectId,
        ref : "Tank"
    },

}, {timestamps : true})
 

export const TankUser = mongoose.model("TankUser", TankUserSchema);