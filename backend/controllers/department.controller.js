import departmentService from '../services/department.service.js';

// GET ALL DEPARTMENTS (For anyone to view)
export async function getAllDepartments(req, res) {
    try {
        const result = await departmentService.getAllDepartments(req.query);
        
        res.status(200).json({
            message: 'Departments retrieved successfully',
            ...result
        });

    } catch (err) {
        console.error('Get all departments error:', err);
        res.status(500).json({ 
            message: 'Server error', 
            error: err.message 
        });
    }
}

// GET SINGLE DEPARTMENT for everyone
export async function getDepartmentById(req, res) {
    try {
        const { id } = req.params;
        const department = await departmentService.getDepartmentById(id);
        
        res.status(200).json({
            message: 'Department retrieved successfully',
            department: department
        });

    } catch (err) {
        console.error('Get department by ID error:', err);
        const statusCode = err.message === 'Department not found' ? 404 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// CREATE DEPARTMENT - Admin only
export async function createDepartment(req, res) {
    try {
        const department = await departmentService.createDepartment(
            req.body,
            req.user.userId
        );

        res.status(201).json({
            message: 'Department created successfully',
            department: department
        });

    } catch (err) {
        console.error('Create department error:', err);
        const statusCode = err.message.includes('required') || 
                          err.message.includes('already exists') || 
                          err.message.includes('not found') || 
                          err.message.includes('must be') ? 400 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// UPDATE DEPARTMENT - Admin only
export async function updateDepartment(req, res) {
    try {
        const { id } = req.params;
        const updatedDepartment = await departmentService.updateDepartment(
            id,
            req.body,
            req.user.userId
        );

        res.status(200).json({
            message: 'Department has been updated successfully',
            department: updatedDepartment
        });

    } catch (err) {
        console.error('Update department error:', err);
        const statusCode = err.message === 'Department not found' ? 404 : 
                          err.message.includes('already exists') || 
                          err.message.includes('not found') || 
                          err.message.includes('must be') ? 400 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// DELETE DEPARTMENT Only for Admin) 
export async function deleteDepartment(req, res) {
    try {
        const { id } = req.params;
        await departmentService.deleteDepartment(id, req.user.userId);

        res.status(200).json({
            message: 'Department has been deleted successfully'
        });

    } catch (err) {
        console.error('Delete department error:', err);
        const statusCode = err.message === 'Department not found' ? 404 : 
                          err.message.includes('doctor(s) assigned') ? 400 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// GET DEPARTMENT STATISTICS (For Admin only)
export async function getDepartmentStats(req, res) {
    try {
        const { id } = req.params;
        const statistics = await departmentService.getDepartmentStats(id);

        res.status(200).json({
            message: 'Department statistics retrieved successfully',
            statistics: statistics
        });

    } catch (err) {
        console.error('Get department stats error:', err);
        const statusCode = err.message === 'Department not found' ? 404 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}

// GET DOCTORS BY DEPARTMENT (For Public)
export async function getDoctorsByDepartment(req, res) {
    try {
        const { id } = req.params;
        const result = await departmentService.getDoctorsByDepartment(id);

        res.status(200).json({
            message: 'Doctors retrieved successfully',
            ...result
        });

    } catch (err) {
        console.error('Get doctors by department error:', err);
        const statusCode = err.message === 'Department not found' ? 404 : 500;
        res.status(statusCode).json({ 
            message: err.message || 'Server error'
        });
    }
}
