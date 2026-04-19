import User from '../models/user.model.js';
import { userTextSearchCondition } from '../utils/searchHelpers.js';
import {
    attachDoctorNamesToMedicalHistory,
    attachDoctorNamesForSearchPatients,
} from '../utils/medicalHistoryDoctorNames.js';
import { isCalendarDateAfterToday } from '../utils/dateValidation.js';

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

        if (diagnosisDate && isCalendarDateAfterToday(diagnosisDate)) {
            throw new Error('Diagnosis date cannot be in the future');
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
            testRecommendations: testRecommendations ? testRecommendations.trim() : '',
            doctorId: doctorId || null
        };

        // Add to medical history 
        if (!patient.medicalHistory) {
            patient.medicalHistory = [];
        }

        patient.medicalHistory.push(medicalHistoryEntry);
        await patient.save();

        console.log(`Medical record added to patient ${patient.username} by doctor ${doctorId}`);

        const medicalHistory = await attachDoctorNamesToMedicalHistory(patient.medicalHistory || []);

        return {
            id: patient._id,
            username: patient.username,
            medicalHistory,
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

        const nameCond = userTextSearchCondition(searchTerm);
        if (!nameCond) {
            throw new Error('Search term must be at least 2 characters');
        }

        const patients = await User.find({
            role: "patient",
            ...nameCond,
        })
        .select('-password -emailVerificationToken -resetToken')
        .limit(20)
        .sort({ firstName: 1, lastName: 1 });

        const withDoctorNames = await attachDoctorNamesForSearchPatients(patients);

        return {
            patients: withDoctorNames.map(({ patient, medicalHistory }) => ({
                id: patient._id,
                username: patient.username,
                email: patient.email,
                firstName: patient.firstName,
                lastName: patient.lastName,
                phoneNumber: patient.phoneNumber,
                bloodGroup: patient.bloodGroup,
                allergies: patient.allergies,
                medicalHistory,
            })),
            count: patients.length
        };
    }

    /**
     * Flatten all patients' medical history for admin (doctor name when doctorId is stored).
     */
    async listMedicalRecordsForAdmin(filters = {}) {
        let page = parseInt(String(filters.page), 10);
        if (Number.isNaN(page) || page < 1) page = 1;
        let limit = parseInt(String(filters.limit), 10);
        if (Number.isNaN(limit) || limit < 1) limit = 25;
        if (limit > 100) limit = 100;
        const search = (filters.search || "").trim().toLowerCase();

        const patients = await User.find({
            role: "patient",
            medicalHistory: { $exists: true, $not: { $size: 0 } },
        })
            .select("firstName lastName username email medicalHistory")
            .lean();

        const rows = [];
        for (const p of patients) {
            const patientName =
                `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.username || "Patient";
            for (const entry of p.medicalHistory || []) {
                rows.push({
                    recordId: entry._id?.toString(),
                    patientId: p._id.toString(),
                    patientName,
                    patientEmail: p.email || "",
                    doctorId: entry.doctorId ? String(entry.doctorId) : null,
                    condition: entry.condition || "",
                    diagnosisDate: entry.diagnosisDate,
                    symptoms: entry.symptoms || "",
                    prescription: entry.prescription || "",
                    notes: entry.notes || "",
                    followUpInstructions: entry.followUpInstructions || "",
                    testRecommendations: entry.testRecommendations || "",
                });
            }
        }

        rows.sort((a, b) => {
            const da = new Date(a.diagnosisDate || 0).getTime();
            const db = new Date(b.diagnosisDate || 0).getTime();
            return db - da;
        });

        const allDoctorIds = [...new Set(rows.map((r) => r.doctorId).filter(Boolean))];
        const doctorMap = {};
        if (allDoctorIds.length > 0) {
            const doctors = await User.find({
                _id: { $in: allDoctorIds },
                role: "doctor",
            })
                .select("firstName lastName username")
                .lean();
            for (const d of doctors) {
                doctorMap[d._id.toString()] =
                    `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.username;
            }
        }

        let filtered = rows;
        if (search) {
            filtered = rows.filter((r) => {
                const doctorName = r.doctorId ? doctorMap[r.doctorId] || "" : "";
                const hay = [
                    r.patientName,
                    r.patientEmail,
                    doctorName,
                    r.condition,
                    r.prescription,
                    r.symptoms,
                    r.notes,
                ]
                    .join(" ")
                    .toLowerCase();
                return hay.includes(search);
            });
        }

        const totalRecords = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
        if (page > totalPages) page = totalPages;
        const skip = (page - 1) * limit;
        const slice = filtered.slice(skip, skip + limit);

        const records = slice.map((r) => ({
            recordId: r.recordId,
            patientId: r.patientId,
            patientName: r.patientName,
            patientEmail: r.patientEmail,
            doctorId: r.doctorId,
            doctorName: r.doctorId ? doctorMap[r.doctorId] || null : null,
            condition: r.condition,
            diagnosisDate: r.diagnosisDate ? new Date(r.diagnosisDate).toISOString() : null,
            symptoms: r.symptoms,
            prescription: r.prescription,
            notes: r.notes,
            followUpInstructions: r.followUpInstructions,
            testRecommendations: r.testRecommendations,
        }));

        return {
            records,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords,
                pageSize: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
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

        const medicalHistory = await attachDoctorNamesToMedicalHistory(patient.medicalHistory || []);

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
            medicalHistory,
            emergencyContact: patient.emergencyContact,
            insuranceInfo: patient.insuranceInfo,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt
        };
    }
}

export default new PatientService();
