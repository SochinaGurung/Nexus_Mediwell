import patientService from '../services/patient.service.js';

/**
 * ADD MEDICAL RECORD TO PATIENT - Doctor only
 */
export async function addMedicalRecord(req, res) {
    try {
        const { patientId } = req.params;
        const { condition, diagnosisDate, notes } = req.body;
        const doctorId = req.user?.userId;

        if (!doctorId) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        const result = await patientService.addMedicalRecord(
            patientId,
            { condition, diagnosisDate, notes },
            doctorId
        );

        res.status(201).json({
            message: 'Medical record added successfully',
            patient: result
        });

    } catch (err) {
        console.error('Add medical record error:', err);
        const statusCode = err.message === 'Patient not found' || err.message === 'User is not a patient' ? 404 :
                          err.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}

/**
 * UPDATE PATIENT ALLERGIES (Only Doctor can do it ) 
 */
export async function updatePatientAllergies(req, res) {
    try {
        const { patientId } = req.params;
        const { allergies } = req.body;
        const doctorId = req.user?.userId;

        if (!doctorId) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        const result = await patientService.updatePatientAllergies(
            patientId,
            allergies,
            doctorId
        );

        res.status(200).json({
            message: 'Patient allergies updated successfully',
            patient: result
        });

    } catch (err) {
        console.error('Update patient allergies error:', err);
        const statusCode = err.message === 'Patient not found' || err.message === 'User is not a patient' ? 404 :
                          err.message.includes('must be') ? 400 : 500;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}
//SEARCH PATIENTS
export async function searchPatients(req, res) {
    try {
        const { search } = req.query;
        const doctorId = req.user?.userId;

        if (!doctorId) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        if (!search) {
            return res.status(400).json({
                message: 'Search term is required'
            });
        }

        const result = await patientService.searchPatients(search);

        res.status(200).json({
            message: 'Patients retrieved successfully',
            ...result
        });

    } catch (err) {
        console.error('Search patients error:', err);
        const statusCode = err.message.includes('at least') ? 400 : 500;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}

//GET PATIENT WITH RECORDS
export async function getPatientWithRecords(req, res) {
    try {
        const { patientId } = req.params;
        const doctorId = req.user?.userId;

        if (!doctorId) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        const patient = await patientService.getPatientWithRecords(patientId);

        res.status(200).json({
            message: 'Patient retrieved successfully',
            patient: patient
        });

    } catch (err) {
        console.error('Get patient with records error:', err);
        const statusCode = err.message === 'Patient not found' || err.message === 'User is not a patient' ? 404 : 500;
        res.status(statusCode).json({
            message: err.message || 'Server error'
        });
    }
}
