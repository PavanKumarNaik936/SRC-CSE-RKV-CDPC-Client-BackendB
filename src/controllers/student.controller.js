import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const generateAccessAndRefreshToken = async(userId)=>{
    try{
        const student= await Student.findById(userId)
        console.log(student);
        const accessToken=student.generateAccessToken()
        
        const refreshToken=student.generateRefreshToken()

        await student.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    }catch(err){
        console.log(err);
        throw new ApiError(500,"Something went wrong while generating tokens");
    }
}

// Controller to register a student
const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, collegeId, year, branch, phone, skills, description, github, linkedIn, portfolio, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !collegeId || !year || !branch || !password) {
    throw new ApiError(400, "All required fields must be filled.");
  }

  // Check if the student already exists
  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    throw new ApiError(409, "A student with this email already exists.");
  }

  // Handle avatar upload if provided
  let avatarUrl = null;
  if (req.file) {
    const uploadedImage = await uploadOnCloudinary(req.file.path);
    console.log(uploadedImage);
    avatarUrl = uploadedImage.secure_url;
  }

  // Create the student in the database
  const newStudent = await Student.create({
    name,
    email,
    collegeId,
    year,
    branch,
    phone,
    skills,
    description,
    github,
    linkedIn,
    portfolio,
    avatar: avatarUrl,
    password,
  });

  const createdStudent = await Student.findById(newStudent._id).select(
    "-password -refreshToken"
  )

  if(!createdStudent){
    throw new ApiError(500,"Some thing went wrong ");
  }

  res.status(201).json(new ApiResponse(201, createdStudent,"Student registered successfully"));
});

//controller to login a student

const loginStudent = asyncHandler(async(req,res)=>{
    const {email,password} = req.body

    if(!email || !password){
        throw new ApiError(400,"email and password are missing")
    }

    const student = await Student.findOne({email});

    if(!student){
        throw new ApiError(404,"Student does not Exist");
    }

    const isPasswordCorrect= await student.isPasswordCorrect(password);

    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid credentials");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(student._id);

    const loggedInStudent= await Student.findById(student._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                student:loggedInStudent,
                accessToken,refreshToken
            },
            "Student logged in successfully"
        )
    )
})

// Controller to update student details
// const updateStudentDetails = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const updates = req.body;

//   const student = await Student.findById(id);
//   if (!student) {
//     throw new ApiError(404, "Student not found.");
//   }

//   // Update avatar if provided
//   if (req.file) {
//     if (student.avatar) {
//       await deleteFromCloudinary(student.avatar); // Remove the old avatar
//     }
//     const uploadedImage = await uploadOnCloudinary(req.file.path, "avatars");
//     updates.avatar = uploadedImage.secure_url;
//   }

//   Object.assign(student, updates);
//   await student.save();

//   res.status(200).json(new ApiResponse(200, "Student details updated successfully", student));
// });

// // Controller to delete a student
// const deleteStudent = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   const student = await Student.findById(id);
//   if (!student) {
//     throw new ApiError(404, "Student not found.");
//   }

//   // Remove avatar from Cloudinary if exists
//   if (student.avatar) {
//     await deleteFromCloudinary(student.avatar);
//   }

//   await student.deleteOne();

//   res.status(200).json(new ApiResponse(200, "Student deleted successfully"));
// });

// Export all controllers
export { registerStudent ,loginStudent};
