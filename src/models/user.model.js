import mongoose , {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Vedio } from "./vedio.model.js";

const UserSchema=new Schema({
    
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true //for making searching efficient
        },

        email:{
            type:String,
            required:true,
            trim:true,
            index:true 
        },
        fullName:{
            type:String,
            required:true,
            trim:true,
            index:true  
        },
        avatar:{
            type:String ,  //cloudinary url ->ek third party hai jo images ya files upload krke url de deta hai
            required:true
        },
        coverImage:{
            type:String, //cloudinary url
        },
        watchHistory:[{  //array containing the id's of the vedio that particular user watched
            type:Schema.Types.ObjectId, //foreing key from vedio model
            ref:Vedio
        }],
        password:{
            type:String,
            required:[true , "Password is required"]
        },
        refreshToken:{
            type:String
        }},{
            timestamps:true
        }
)
//password save hone se just pehle ye code execute hojata hai yani passowrd encryot hojayega
UserSchema.pre("save" , async function(next){
if(!this.isModified("password")) return next(); //agar password modify nhi hua hai to there is no need for ecnrypting it
this.password=await bcrypt.hash(this.password , 10)
next();
})


//checking is the password is correct
UserSchema.methods.isPasswordCorrect= async function(password){
 return   await  bcrypt.compare(password , this.password) ; //comparing the encrypted password and the password send by the user
}


//generating the access token
UserSchema.methods.generateAccessToken=async function(){
  return jwt.sign(
    {
        _id:this.id,
        email:this.email,
        username:this.username,
        fullName:this.fullName
    } ,
     process.env.ACCESS_TOKEN_SECRET , 
     {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
     }
   )
}


//generating the refersh token
UserSchema.methods.generateRefreshToken=async function(){
 return jwt.sign(
    {
        _id:this.id,
    } ,
     process.env.REFRESH_TOKEN_SECRET , 
     {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
     }
   )
}


export const User=mongoose.model("User" , UserSchema)