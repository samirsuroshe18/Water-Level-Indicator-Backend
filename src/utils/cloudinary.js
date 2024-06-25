import { v2 as cloud } from "cloudinary";
import fs from 'fs'

cloud.config({
    cloud_name: 'daaciwspp',
    api_key: '843341365436836',
    api_secret: '41kT4bjyG-IkCQlUGLmuL8eWzhY',
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        
        const response = await cloud.uploader.upload(localFilePath, { resource_type: "auto" });
        console.log("file is uploaded on cloudinary sdk : ", response.url);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)//remove the locally saved temporary files as the upload operation got successfull
        }
 
        return response;
    }
    catch (err) {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)//remove the locally saved temporary files as the upload operation got failed
        }
        return null;
    }
}

const deleteCloudinary = async (cloudinaryFilePath) => {
    try {
        //Getting public Id
        const publicId = String(cloudinaryFilePath.split("/").pop().split(".")[0]);
        console.log("This is public Id of thumbnail", publicId);
        //Validating Public ID
        if (!publicId) {
            return console.log("No public Id present");
        }
        cloud.uploader.destroy(publicId).then((result) => console.log(result));

    } catch (error) {
        console.log(error.message);
    }
}

export { uploadOnCloudinary, deleteCloudinary };
