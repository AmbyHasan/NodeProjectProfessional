import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer"

const app=express();

app.use(cors({
    origin : process.env.CORS_ORIGIN, //only the request coming from this origin will be entertained
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" })); //to parse the data that comes from url
app.use(express.static("public")); //some assests(files , photos) that i will store on the server itself
app.use(cookieParser());

//ROUTES
import userRouter from './routes/user.routes.js'  //routes import

//routes declaration , kuki routes alag file me defined isiliye instead of writing app.get() we are writing app.use()

app.use("/api/v1/users",  userRouter)




export { app }