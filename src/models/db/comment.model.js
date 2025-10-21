import mongoose , {Schema} from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import { Vedio } from "../vedio.model";
import { User } from "../user.model";

const commentSchema = new Schema({
  content:{
    type:String,
    required:true
  } ,
  vedio:{
    type:Schema.Types.ObjectId,
    ref:"Vedio"
  },
  owner:{
    type:Schema.Types.ObjectId,
    ref:"User"
  }

}  ,{
    timestamps:true
})

commentSchema.plugin(mongooseAggregatePaginate);
export const Comment=mongoose.model("Comment" , commentSchema)