import User from "../models/user.model.js";
import { userTextSearchCondition } from "../utils/searchHelpers.js";

class DoctorService {
    
    async getAllDoctors(filters = {}) {
        const { department, specialization, search, includeInactive } = filters;

        const filter = { role: "doctor" };
        if (!includeInactive) {
            filter.isActive = true;
        }
        
        // Filter doctors by department
        if (department) {
            filter.department = department;
        }
        
        // Filter doctors by specialization
        if (specialization) {
            filter.specialization = specialization;
        }
        
        if (search) {
            const nameCond = userTextSearchCondition(search);
            if (nameCond) {
                filter.$or = nameCond.$or;
            }
        }
        
        const doctors = await User.find(filter)
            .select("-password -emailVerificationToken -resetToken")
            .sort({ firstName: 1, lastName: 1 });
        
        return {
            doctors: doctors.map(doctor => ({
                id: doctor._id,
                username: doctor.username,
                email: doctor.email,
                firstName: doctor.firstName,
                lastName: doctor.lastName,
                phoneNumber: doctor.phoneNumber,
                specialization: doctor.specialization,
                department: doctor.department,
                yearsOfExperience: doctor.yearsOfExperience,
                consultationFee: doctor.consultationFee,
                bio: doctor.bio,
                profilePicture: doctor.profilePicture,
                qualifications: doctor.qualifications,
                availability: doctor.availability,
                isActive: doctor.isActive
            })),
            count: doctors.length
        };
    }

    //Fetch doctor by ID
     
    async getDoctorById(doctorId) {
        const doctor = await User.findOne({ _id: doctorId, role: "doctor" })
            .select("-password -emailVerificationToken -resetToken");
        
        if (!doctor) {
            throw new Error("Doctor not found");
        }
        
        return {
            id: doctor._id,
            username: doctor.username,
            email: doctor.email,
            firstName: doctor.firstName,
            lastName: doctor.lastName,
            phoneNumber: doctor.phoneNumber,
            specialization: doctor.specialization,
            department: doctor.department,
            yearsOfExperience: doctor.yearsOfExperience,
            consultationFee: doctor.consultationFee,
            bio: doctor.bio,
            profilePicture: doctor.profilePicture,
            qualifications: doctor.qualifications,
            availability: doctor.availability,
            isActive: doctor.isActive,
            createdAt: doctor.createdAt,
            updatedAt: doctor.updatedAt
        };
    }

    //Update doctor profile
     
    async updateDoctorProfile(doctorId, data) {
        const allowedFields = [
            "firstName",
            "lastName",
            "phoneNumber",
            "address",
            "specialization",
            "department",
            "qualifications",
            "yearsOfExperience",
            "consultationFee",
            "bio"
        ];
        
        const updateData = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        const doctor = await User.findByIdAndUpdate(
            doctorId,
            { ...updateData, role: "doctor" },
            { new: true, runValidators: true }
        ).select("-password");

        if (!doctor || doctor.role !== "doctor") {
            throw new Error("Doctor not found");
        }
        
        return {
            id: doctor._id,
            username: doctor.username,
            email: doctor.email,
            firstName: doctor.firstName,
            lastName: doctor.lastName,
            phoneNumber: doctor.phoneNumber,
            specialization: doctor.specialization,
            department: doctor.department,
            yearsOfExperience: doctor.yearsOfExperience,
            consultationFee: doctor.consultationFee,
            bio: doctor.bio,
            profilePicture: doctor.profilePicture,
            qualifications: doctor.qualifications
        };
    }

    //Update doctor availability for a specific day
    async updateAvailability(doctorId, day, availabilityData) {
        const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
        
        if (!doctor) {
            throw new Error("Doctor not found");
        }

        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!validDays.includes(day)) {
            throw new Error("Invalid day. Must be one of: " + validDays.join(", "));
        }

        if (!doctor.availability) {
            doctor.availability = {};
        }

        doctor.availability[day] = {
            ...doctor.availability[day],
            ...availabilityData
        };
        
        await doctor.save();
        
        return {
            id: doctor._id,
            availability: doctor.availability
        };
    }

    //Activate or deactivate doctor

    async setDoctorStatus(doctorId, isActive) {
        const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
        
        if (!doctor) {
            throw new Error("Doctor not found");
        }

        doctor.isActive = isActive;
        await doctor.save();
        
        return {
            id: doctor._id,
            username: doctor.username,
            isActive: doctor.isActive
        };
    }
}
export default new DoctorService();
