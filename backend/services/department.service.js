import Department from '../models/department.model.js';
import User from '../models/user.model.js';


class DepartmentService {
    
    //Get all departments 
    async getAllDepartments(filters = {}) {
        const { 
            isActive, 
            search,
            page = 1, 
            limit = 20,
            sortBy = 'departmentName',
            sortOrder = 'asc'
        } = filters;

        const filter = {};
        
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true' || isActive === true;
        }

        // Search filter
        if (search) {
            filter.$or = [
                { departmentName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { departmentCode: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const totalDepartments = await Department.countDocuments(filter);

        // Fetch departments
        const departments = await Department.find(filter)
            .populate('headOfDepartment', 'username email firstName lastName specialization')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber);

        const totalPages = Math.ceil(totalDepartments / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        return {
            departments,
            pagination: {
                currentPage: pageNumber,
                totalPages: totalPages,
                totalDepartments: totalDepartments,
                departmentsPerPage: limitNumber,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage
            },
            filters: {
                isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : null,
                search: search || null
            }
        };
    }

    
    //Get department by ID
    
    async getDepartmentById(id) {
        const department = await Department.findById(id)
            .populate('headOfDepartment', 'username email firstName lastName specialization department');

        if (!department) {
            throw new Error('Department not found');
        }

        return department;
    }

    
    //Create a new department
    async createDepartment(departmentData, adminUserId) {
        const {
            departmentName,
            description,
            departmentCode,
            phoneNumber,
            email,
            location,
            headOfDepartment,
            services,
            operatingHours,
            specialties,
            image
        } = departmentData;

        // Validation
        if (!departmentName || !description) {
            throw new Error('Department name and description are required');
        }

        // Checks if department name already exists
        const existingDepartment = await Department.findOne({ departmentName });
        if (existingDepartment) {
            throw new Error('Department with this name already exists');
        }

        // Check if department code already exists 
        if (departmentCode) {
            const existingCode = await Department.findOne({ departmentCode });
            if (existingCode) {
                throw new Error('Department code already exists');
            }
        }

        // Validate head of department if provided
        if (headOfDepartment) {
            const headDoctor = await User.findById(headOfDepartment);
            if (!headDoctor) {
                throw new Error('Head of department (doctor) not found');
            }
            if (headDoctor.role !== 'doctor') {
                throw new Error('Head of department must be a doctor');
            }
        }

        // Create department
        const department = new Department({
            departmentName: departmentName.trim(),
            description: description.trim(),
            departmentCode: departmentCode ? departmentCode.trim().toUpperCase() : null,
            phoneNumber: phoneNumber ? phoneNumber.trim() : null,
            email: email ? email.trim().toLowerCase() : null,
            location: location || {},
            headOfDepartment: headOfDepartment || null,
            services: services || [],
            operatingHours: operatingHours || {},
            specialties: specialties || [],
            image: image || null,
            isActive: true
        });

        await department.save();

        // Populate head of department for response
        await department.populate('headOfDepartment', 'username email firstName lastName specialization');

        // Get admin user for logging
        const adminUser = await User.findById(adminUserId);
        console.log(` Department created: ${department.departmentName} by admin ${adminUser?.username}`);

        return department;
    }

    

    
}
export default new DepartmentService();
