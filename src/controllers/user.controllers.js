import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Subscription } from "../models/db/subscription.modell.js";
import mongoose from "mongoose";

//METHOD FOR GENERATING ACCESS AND REFRESH TOKENS
const generateAccessAndRefreshToken= async(userId)=>{
   try{
       const user= await User.findById(userId);
       const accessToken= await user.generateAccessToken();
       const refreshToken= await user.generateRefreshToken();

       user.refreshToken=refreshToken; //adding the refresh token to the database
       await user.save({validateBeforeSave:false}); //no need for validation over here , seedha save krdo token

       return {accessToken , refreshToken};

   }catch(error){
      throw new ApiError(500 , "Something went wrong while generating refersh and access token");
   }
}


//controller for registering the user
const registerUser=asyncHandler( async(req  ,res)=>{
    
   // 1-> get user details from frontend
   //2-> validation on input -> not empty
   //3-> check if user already exists in the database : username , email
   //4->check for images , check for avatar
   //5->upload them to cloudinary
   //6->create entry in the database
   //7->remove password and refresh token field from response
   //8->check for user creation
   //return yes

   //get user details
   const {fullName  , email , password  ,username} = req.body;
   console.log(fullName);

   //validation

   if(
    [fullName , email , password , username].some((field)=> field?.trim()==="")
   ){
         throw new ApiError(400 , "All fields are required")
    
   }

   //checking if user alread exists in the database

   const existingUser= await  User.findOne({
      $or:[ {email} , {username}]
   })
   if(existingUser){
   
      throw new ApiError(409 , "User with this email or username already exists")
      
   }

   ///checking for avatar
   const avatarLocalPath= req.files?.avatar?.[0]?.path;
   //checking for avatar
   const coverImageLocalPath=req.files?.coverImage?.[0]?.path;


   if(!avatarLocalPath) throw new ApiError( 400  ,"Avatar is  required");
   console.log("req.files:", req.files);


   //upload on cloudinary
const avatar= await uploadOnCloudinary(avatarLocalPath);
if(!avatar) throw new ApiError( 400  ,"Avatar is  required");

//uploading cover image on cloudinary only is it exists
let coverImageUrl="";
if(coverImageLocalPath){
  const coverImage=await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage?.url) throw new ApiError(400 , "Error uploading cover image");
  coverImageUrl=coverImage.url;
}






//now do the entry in the database

const user=await User.create({
    fullName ,
    avatar: avatar.url, //only the url of  the file given by cloudinary is to be inserted in the database by us
    coverImage: coverImageUrl ,
    email ,
    password ,
    username : username.toLowerCase()
})
//getting the response from the user db that user is created in the db or not -> password and refreshtoken fields are excluded
 const createdUser=await User.findById(user._id).select(
    "-password -refreshToken" 
 )

 if(!createdUser)  throw new ApiError(500 , "Something went wrong while registering the user")

  return res.status(201).json(
    new ApiResponse(200 , createdUser , "User registered successfully")
  )

})


//controller for Login user 
const loginUser=asyncHandler(  async( req ,res)=>{

   //STEPS
   // get data from req->body
   //login  on basis of username or email
   //find the user
   //check for password
   // generate access and refersh token and send both of them to the user
   //send cookie

   const { email , username , password}=req.body;

   if(!username && !email) throw new ApiError(400 , "Username or password is required");
  

   const user= await User.findOne({  //ya to email ya to username se mujhe user dhoondh do
      $or: [ {email} , {username}]
   })
   console.log(user);

   if(!user) throw new ApiError(404 , "User does not exits");
  
    //now compare the passwords given by the user and the password present in the database
   
   const isPasswordValid=await user.isPasswordCorrect(password);

   if(!isPasswordValid) throw new ApiError(401 , "Invalid user credentials");
   
   //generating tokens
   const{accessToken , refreshToken}= await generateAccessAndRefreshToken(user._id);

   //now send the info to the user in the form of cookies
     
   const loggedInUser=await User.findById(user._id).select( "-password -refreshToken");

   const options={
      httpOnly:true, //cookies are only modifiable by the server
      secure :true
   }

   console.log(loggedInUser);
   return res.status(200).
   cookie( "accessToken" , accessToken , options).
   cookie("refreshToken" , refreshToken  , options)
   .json(
      new ApiResponse(
         200,{
              user : loggedInUser , accessToken , refreshToken
         },
         "User logged in successfully"
      )
   )
   






})


//controller for logging out the user
const logoutUser=asyncHandler( async(req ,res)=>{
   //removing the tokens from db
    await User.findByIdAndUpdate(
       req.user._id,  //middleware me ye user attach kar diya hai hmne
       {
         $unset:{ refreshToken : 1 } //this removes the field from the docoument
       },{
         new :true //return me jo response aayega usme new updated value milegii
       }
     ) 
     //remove the token present in the cookies shared with the user
     const options={ //cookies are only modifiable by the server
      httpOnly:true,
      secure:true
     }  
     return res.status(200).clearCookie("accessToken" , options).clearCookie("refreshToken" , options)
     .json(new ApiResponse(200 , {}, "User logged out successfully"))
})



//controller for refreshing the acces token
const refreshAccessToken= asyncHandler( async(req ,res )=>{
   const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken;
   
   if(!incomingRefreshToken) throw new ApiError( 401 ,"Unauthorized request");

   //verify the incoming token with the refresh token present in the JWT

 try {
     const decodedToken=jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET );
     const user=await User.findById(decodedToken?._id);
     if(!user)  throw new ApiError( 401 ,"Invalid refresh token");
  
     //match the incoming refersh token with the token present in the database
     console.log("Incoming refresh token:", incomingRefreshToken);
    console.log("User refresh token from DB:", user.refreshToken);

  
     if(incomingRefreshToken!==user?.refreshToken){
        throw new ApiError(401 , "Refresh token is expired or used");
     }
  
     //now generate new access and refersh tokens
  
      const options={
        httpOnly:true,
        secure :true
      }
     
     const {accessToken  , refreshToken} = await generateAccessAndRefreshToken(user._id);
  
      return res.status(200)
      .cookie("accessToken" , accessToken,options)
      .cookie("refreshToken" , refreshToken , options)
      .json(
        new ApiResponse(200 , {accessToken ,refreshToken} , "Access token refreshed")
      )
 } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token" );
 }


    
})

//change currentUserPassword
const changeCurrentPassword= asyncHandler(async(req ,res)=>{
   const {oldPassword , newPassword}=req.body;

   //kuki middleware se hoke aa rhe hai isiliye db wali id tha access hai hamare pass
   const user= await User.findById(req.user?._id);
   
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);
   if(!isPasswordCorrect) throw new ApiError(400 , "Invalid Password");

   user.password=newPassword; //setting the new password in database
   await user.save({validateBeforeSave:false}); // save krte time koi validation nhi  karana hai

   return res.status(200)
   .json(new ApiResponse(200 , {} , "Password changes succefully"))

})

//get the current user
const getCurrentUser= asyncHandler(async(req ,res)=>{
   //middleware me hi user object inject krdiya tha req ki body mein
   return res.status(200).
   json(new ApiResponse(200 , req.user , "current user fetched succesfully"));
})

//update your details
const updateAccountDetails= asyncHandler(async(req ,res)=>{
   const {fullName ,email}= req.body;
   if(!fullName && !email) throw new ApiError(400 ,"all fields are required");

     const user=User.findByIdAndUpdate(
      req.user?._id ,
      {
         $set:{
            fullName,
            email:email //both syntaxes will produce same results
         }
      },
      {new :true} //update hone ke bad wali info return hogii
   ).select("-password")
   return res.status(200).
   json(new ApiResponse(200 , user , "Account details updated successfully" ));


})

//update user avatar
const updateUserAvatar= asyncHandler( async(req ,res)=>{

    const avatarLocalPath=req.file?.path; // multer middleware se file mil jayegi

    if(!avatarLocalPath){
      throw new ApiError(400  ,"Avatar path is missing");
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url)  throw new ApiError(400  ,"Error while uploading on avatar");

   const user =await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            avatar:avatar.url
         }
      },
      {new :true}
   ).select("-password");
   return res.status(200).json(new ApiResponse(200 , user , "avatar updated sucessfully"))


})

//update user coverImage
const updateUserCoverImage=asyncHandler(async (req  ,res)=>{
   //get the file from multer
   const coverImageLocalPath=req.file?.path;
   if(!coverImageLocalPath) throw new ApiError(400 ,"Cover image path is missing ");

   //now upload this file on cloudinary
   const coverImage=uploadOnCloudinary(coverImageLocalPath);
   
   //now get the url from cloudinary
   if(coverImage?.url) throw new ApiError(400 , "Error while uploading file on cloudinary");

   //now make the changes in db
   const  user=User.findByIdAndUpdate(
      req.file?.path,
      {
         $set:{
            coverImage:coverImage.url
         }
      },
      {
         new:true
      }
   ).select("-password")
      return res.status(200).json(new ApiResponse(200 , user , "coverimage updated sucessfully"))

})

//get user channel profile
const getUserChannel=asyncHandler( async(req ,res)=>{
   const {username}= req.params;
   if(!username?.trim()) throw new ApiError(400 , "username is missing");

    const channel = await User.aggregate([
      {
          $match:{
            username : username?.toLowerCase()  //ye mere desired user ko filter kar dega baaki sabhi documents me se
          }
      } ,
      {
         $lookup:{                //finding out who are my subscribers
            from :"Subscription" ,
            localField:"_id" , //“From the Subscription collection, find all documents where channel equals this user’s _id and store them in subscribers array.”
            foreignField:"channel",
            as:"subscribers"

         }
      } ,
      {
        $lookup:{          //finding out the channels i have subscribed
          from :"Subscription" ,  //“From Subscription, find all where this user’s _id is in the subscriber field so we get the list of all the channels the user  has subscribed to”
            localField:"_id" ,
            foreignField:"subscriber",
            as:"subscribedTo"
        }
      } ,{     //adding some additional info in the user document
         $addFields:{
             subscriberCount:{
               $size: "$subscribers"
             } ,
             channelsSubsribedToCount:{
               $size:"$subscribedTo"
             },
             isSubscribed:{ //if a particular  channel is subscribed by the user then we will return true otherwise false
               $cond:{
                  if:{$in: [req.user?._id , "$subscribers.subscriber"]},
                  then:true,
                  else : false
               }
             }
         }
      },{
         $project:{     //the values that i want to project
            fullName:1,
            username:1,
            subscriberCount:1,
            channelsSubsribedToCount:1,
            isSubscribed:1,
            coverImage:1,
            avatar:1,
            email:1
        }
      }
    ])

    if(!channel?.length) throw new ApiError(404 ,"channel does not exists");

    return res.status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully.."))
})

//get your watch history

const getWatchHistory=asyncHandler( async(req ,res)=>{
   const user=await User.aggregate([
      {

         $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)  //req.user_id is of type "string" therrofr we are converting it first into type "ObjectId"
         }
      },{
         $lookup:{
            from :"vedios",
            localField:"watchHistory",
            foreignField:"_id",
            as : "watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from :"users",
                     localField:"owner",
                     foreignField:"_id",
                     as : "owner",
                     pipeline:[
                        {
                           $project:{
                               fullName:1,
                               username:1,
                               avatar:1
                           }
                        }
                     ]
                  }
               }
            ]
         }
      } ,{
         $addFields:{
          owner:{
            $first : "$owner"
          }
         }
         
      }
   ])

   return res.status(200)
   .json(new ApiResponse(200 , user[0].watchHistory , "watch history fetched succecssfully"))
})

export {registerUser ,loginUser , logoutUser ,refreshAccessToken , changeCurrentPassword , getCurrentUser ,updateAccountDetails , updateUserAvatar ,updateUserCoverImage  , getUserChannel,getWatchHistory}