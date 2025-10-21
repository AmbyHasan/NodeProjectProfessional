import {Router} from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannel, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name :"avatar",
            maxCount:1 //number of files that can be taken
        },{
            name: "coverImage",
            maxCount:3

        }
    ]) , //it accepts array of multilple files
    registerUser) //call the registerUser method


router.route("/login").post(loginUser);

//secured routes ->routes that are only accesible after you login
 router.route("/logout" ).post(verifyJWT , logoutUser);
 router.route("/refresh-token").post(refreshAccessToken );
 router.route("/change-password").post(verifyJWT , changeCurrentPassword);
 router.route("/current-user").get(verifyJWT, getCurrentUser);
 router.route("/update-account").patch(verifyJWT , updateAccountDetails);

 //route for updating avatar
 router.route("/avatar").patch(verifyJWT ,upload.single("avatar") ,updateUserAvatar);  //avatar is the form field name that carries the uploaded file
 //router for updating cover image
 router.route("/cover-image").patch(verifyJWT , upload.single("coverImage") ,updateUserCoverImage);
 
 //router for getting user profile
 router.route("/c/:username").get(verifyJWT , getUserChannel);
 router.route("/history").get(verifyJWT , getWatchHistory);
 export default router
