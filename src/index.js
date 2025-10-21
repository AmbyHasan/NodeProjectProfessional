
import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
})
import express from "express";
import connectDB from "./models/db/index.js";
import {app} from"./app.js"







connectDB()
.then(()=>{
   app.listen( process.env.PORT  ,()=>{
      console.log(`server listening on PORT ${process.env.PORT}`);
   })
})
.catch( (err)=>{
    console.log("mongodb connection failed" ,err);
})
 












































//<------------------------------------------------------------->
// IIFE FUNCTION 
// (async () => {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     console.log("✅ Connected to MongoDB");

//     // Listen for server errors
//     app.on("error", (error) => {
//       console.error("❌ Server Error:", error);
//       throw error;
//     });

//     // Start the server with a fallback port
//     const PORT = process.env.PORT || 5000;
//     app.listen(PORT, () => {
//       console.log(`🚀 App listening on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error("❌ Initialization Error:", err);
//     process.exit(1); // Exit the process if DB connection fails
//   }
// })();
