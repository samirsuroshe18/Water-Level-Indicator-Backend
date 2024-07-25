import mongoose, {Schema} from "mongoose";


const AccessTankSchema = new Schema({
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
 

export const AccessTank = mongoose.model("AccessTank", AccessTankSchema);