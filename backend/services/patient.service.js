import User from '../models/user.model.js';



class PatientService {
    
    //Add medical record entry to patient (Doctor only)
    
    async addMedicalRecord(patientId, medicalRecordData, doctorId) {
        const {
            condition,
            diagnosisDate,
            symptoms,
            prescription,
            notes,
            followUpInstructions,
            testRecommendations
        } = medicalRecordData;

        // Validation
        if (!condition || !condition.trim()) {
            throw new Error('Condition is required');
        }

        // Find patient
        const patient = await User.findById(patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        if (patient.role !== 'patient') {
            throw new Error('User is not a patient');
        }

        // Create medical history entry
        const medicalHistoryEntry = {
            condition: condition.trim(),
            diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : new Date(),
            symptoms: symptoms ? symptoms.trim() : '',
            prescription: prescription ? prescription.trim() : '',
            notes: notes ? notes.trim() : '',
            followUpInstructions: followUpInstructions ? followUpInstructions.trim() : '',
            testRecommendations: testRecommendations ? testRecommendations.trim() : ''
        };

        // Add to medical history 
        if (!patient.medicalHistory) {
            patient.medicalHistory = [];
        }

        patient.medicalHistory.push(medicalHistoryEntry);
        await patient.save();

        console.log(`Medical record added to patient ${patient.username} by doctor ${doctorId}`);

        return {
            id: patient._id,
            username: patient.username,
            medicalHistory: patient.medicalHistory,
            updatedAt: patient.updatedAt
        };
    }

    //Update patient allergies 
    
    async updatePatientAllergies(patientId, allergies, doctorId) {
        const patient = await User.findById(patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        if (patient.role !== 'patient') {
            throw new Error('User is not a patient');
        }

        if (!Array.isArray(allergies)) {
            throw new Error('Allergies must be an array');
        }

        patient.allergies = allergies.map(allergy => allergy.trim()).filter(Boolean);
        await patient.save();

        console.log(`✅ Allergies updated for patient ${patient.username} by doctor ${doctorId}`);

        return {
            id: patient._id,
            username: patient.username,
            allergies: patient.allergies,
            updatedAt: patient.updatedAt
        };
    }

    
    //Search patients by name, username, or email 
    
    async searchPatients(searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            throw new Error('Search term must be at least 2 characters');
        }

        const patients = await User.find({
            role: 'patient',
            $or: [
                { username: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { firstName: { $regex: searchTerm, $options: 'i' } },
                { lastName: { $regex: searchTerm, $options: 'i' } }
            ]
        })
        .select('-password -emailVerificationToken -resetToken')
        .limit(20)
        .sort({ firstName: 1, lastName: 1 });

        return {
            patients: patients.map(patient => ({
                id: patient._id,
                username: patient.username,
                email: patient.email,
                firstName: patient.firstName,
                lastName: patient.lastName,
                phoneNumber: patient.phoneNumber,
                bloodGroup: patient.bloodGroup,
                allergies: patient.allergies,
                medicalHistory: patient.medicalHistory
            })),
            count: patients.length
        };
    }

    //Get patient by ID with medical records 
    
    async getPatientWithRecords(patientId) {
        const patient = await User.findById(patientId)
            .select('-password -emailVerificationToken -resetToken');

        if (!patient) {
            throw new Error('Patient not found');
        }

        if (patient.role !== 'patient') {
            throw new Error('User is not a patient');
        }

        return {
            id: patient._id,
            username: patient.username,
            email: patient.email,
            firstName: patient.firstName,
            lastName: patient.lastName,
            phoneNumber: patient.phoneNumber,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            allergies: patient.allergies || [],
            medicalHistory: patient.medicalHistory || [],
            emergencyContact: patient.emergencyContact,
            insuranceInfo: patient.insuranceInfo,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt
        };
    }
}

export default new PatientService();
