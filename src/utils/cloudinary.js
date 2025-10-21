import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

// Configuration
cloudinary.config({
    cloud_name:"" ,
    api_key:"" ,
    api_secret: ""
});

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("File uploaded on Cloudinary:", response.url);

        // Remove local file
        await fs.unlink(localFilePath);

        return response;

    } catch (error) {
        console.error("❌ Cloudinary upload failed:", error.message);
        // Try removing local file if it exists
        try { await fs.unlink(localFilePath); } catch {}
        return null;
    }
};

export { uploadOnCloudinary };
