import Service from '../models/service.model.js';
import Department from '../models/department.model.js';


class ServiceService {
    /**
     * Get all services with filtering and pagination
     */
    async getAllServices(filters = {}) {
        const { 
            category,
            isAvailable,
            isActive,
            department,
            search,
            minPrice,
            maxPrice,
            page = 1, 
            limit = 20,
            sortBy = 'serviceName',
            sortOrder = 'asc'
        } = filters;

        // Build filter
        const filter = {};
        
        if (category) {
            filter.category = category;
        }

        if (isAvailable !== undefined) {
            filter.isAvailable = isAvailable === 'true' || isAvailable === true;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true' || isActive === true;
        }

        if (department) {
            filter.departments = department;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.basePrice = {};
            if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
        }

        // Search filter
        if (search) {
            filter.$or = [
                { serviceName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { serviceCode: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Calculate pagination
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get total count
        const totalServices = await Service.countDocuments(filter);

        // Fetch services
        const services = await Service.find(filter)
            .populate('departments', 'departmentName departmentCode')
            .sort(sort)
            .skip(skip)
            .limit(limitNumber);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalServices / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        return {
            services: services,
            pagination: {
                currentPage: pageNumber,
                totalPages: totalPages,
                totalServices: totalServices,
                servicesPerPage: limitNumber,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage
            },
            filters: {
                category: category || null,
                isAvailable: isAvailable !== undefined ? (isAvailable === 'true' || isAvailable === true) : null,
                isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : null,
                department: department || null,
                search: search || null,
                priceRange: (minPrice || maxPrice) ? { min: minPrice || null, max: maxPrice || null } : null
            }
        };
    }

    /**
     * Get service by ID
     */
    async getServiceById(id) {
        const service = await Service.findById(id)
            .populate('departments', 'departmentName departmentCode description location');

        if (!service) {
            throw new Error('Service not found');
        }

        return service;
    }

    /**
     * Create service
     */
    async createService(serviceData) {
        const {
            serviceName,
            description,
            serviceCode,
            category,
            basePrice,
            currency,
            estimatedDuration,
            departments,
            requirements,
            preparationInstructions,
            isAvailable,
            requiresAppointment,
            advanceBookingDays,
            image,
            tags
        } = serviceData;

        // Validation
        if (!serviceName || !description || !category || !basePrice || !estimatedDuration) {
            throw new Error('Service name, description, category, base price, and estimated duration are required');
        }

        // Validate category
        const validCategories = [
            'Emergency', 'Diagnostics', 'Surgery', 'Pharmacy', 'Laboratory',
            'Telemedicine', 'Consultation', 'Therapy', 'Imaging', 'Other'
        ];
        if (!validCategories.includes(category)) {
            throw new Error(`Invalid category. Valid categories: ${validCategories.join(', ')}`);
        }

        // Check if service name already exists
        const existingService = await Service.findOne({ serviceName });
        if (existingService) {
            throw new Error('Service with this name already exists');
        }

        // Check if service code already exists (if provided)
        if (serviceCode) {
            const existingCode = await Service.findOne({ serviceCode });
            if (existingCode) {
                throw new Error('Service code already exists');
            }
        }

        // Validate departments if provided
        if (departments && departments.length > 0) {
            const validDepartments = await Department.find({ 
                _id: { $in: departments } 
            });
            if (validDepartments.length !== departments.length) {
                throw new Error('One or more departments not found');
            }
        }

        // Create service
        const service = new Service({
            serviceName: serviceName.trim(),
            description: description.trim(),
            serviceCode: serviceCode ? serviceCode.trim().toUpperCase() : null,
            category: category,
            basePrice: parseFloat(basePrice),
            currency: currency || 'NPR',
            estimatedDuration: parseInt(estimatedDuration),
            departments: departments || [],
            requirements: requirements || [],
            preparationInstructions: preparationInstructions ? preparationInstructions.trim() : null,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            requiresAppointment: requiresAppointment !== undefined ? requiresAppointment : true,
            advanceBookingDays: advanceBookingDays || 30,
            image: image || null,
            tags: tags || [],
            isActive: true
        });

        await service.save();

        // Populate departments for response
        await service.populate('departments', 'departmentName departmentCode');

        return service;
    }

    /**
     * Update service
     */
    async updateService(id, updateData) {
        const service = await Service.findById(id);
        if (!service) {
            throw new Error('Service not found');
        }

        const {
            serviceName,
            description,
            serviceCode,
            category,
            basePrice,
            currency,
            estimatedDuration,
            departments,
            requirements,
            preparationInstructions,
            isAvailable,
            requiresAppointment,
            advanceBookingDays,
            image,
            tags,
            isActive
        } = updateData;

        // Build update object
        const updates = {};

        if (serviceName !== undefined) {
            if (serviceName !== service.serviceName) {
                const existing = await Service.findOne({ 
                    serviceName: serviceName.trim(),
                    _id: { $ne: id }
                });
                if (existing) {
                    throw new Error('Service with this name already exists');
                }
            }
            updates.serviceName = serviceName.trim();
        }

        if (description !== undefined) updates.description = description.trim();
        if (category !== undefined) {
            const validCategories = [
                'Emergency', 'Diagnostics', 'Surgery', 'Pharmacy', 'Laboratory',
                'Telemedicine', 'Consultation', 'Therapy', 'Imaging', 'Other'
            ];
            if (!validCategories.includes(category)) {
                throw new Error(`Invalid category. Valid categories: ${validCategories.join(', ')}`);
            }
            updates.category = category;
        }
        if (basePrice !== undefined) updates.basePrice = parseFloat(basePrice);
        if (currency !== undefined) updates.currency = currency;
        if (estimatedDuration !== undefined) updates.estimatedDuration = parseInt(estimatedDuration);
        if (requirements !== undefined) updates.requirements = Array.isArray(requirements) ? requirements : [];
        if (preparationInstructions !== undefined) updates.preparationInstructions = preparationInstructions ? preparationInstructions.trim() : null;
        if (isAvailable !== undefined) updates.isAvailable = isAvailable;
        if (requiresAppointment !== undefined) updates.requiresAppointment = requiresAppointment;
        if (advanceBookingDays !== undefined) updates.advanceBookingDays = parseInt(advanceBookingDays);
        if (image !== undefined) updates.image = image;
        if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
        if (isActive !== undefined) updates.isActive = isActive;

        // Handle service code
        if (serviceCode !== undefined) {
            if (serviceCode && serviceCode !== service.serviceCode) {
                const existingCode = await Service.findOne({ 
                    serviceCode: serviceCode.trim().toUpperCase(),
                    _id: { $ne: id }
                });
                if (existingCode) {
                    throw new Error('Service code already exists');
                }
            }
            updates.serviceCode = serviceCode ? serviceCode.trim().toUpperCase() : null;
        }

        // Handle departments
        if (departments !== undefined) {
            if (departments.length > 0) {
                const validDepartments = await Department.find({ 
                    _id: { $in: departments } 
                });
                if (validDepartments.length !== departments.length) {
                    throw new Error('One or more departments not found');
                }
            }
            updates.departments = departments;
        }

        // Update service
        const updatedService = await Service.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('departments', 'departmentName departmentCode');

        return updatedService;
    }

    /**
     * Delete service
     */
    async deleteService(id) {
        const service = await Service.findByIdAndDelete(id);

        if (!service) {
            throw new Error('Service not found');
        }

        return { message: 'Service deleted successfully' };
    }

    /**
     * Get services by category
     */
    async getServicesByCategory(category) {
        const validCategories = [
            'Emergency', 'Diagnostics', 'Surgery', 'Pharmacy', 'Laboratory',
            'Telemedicine', 'Consultation', 'Therapy', 'Imaging', 'Other'
        ];
        
        if (!validCategories.includes(category)) {
            throw new Error(`Invalid category. Valid categories: ${validCategories.join(', ')}`);
        }

        const services = await Service.find({ 
            category: category,
            isActive: true,
            isAvailable: true
        })
        .populate('departments', 'departmentName departmentCode')
        .sort({ serviceName: 1 });

        return {
            category: category,
            services: services,
            count: services.length
        };
    }

    /**
     * Get services by department
     */
    async getServicesByDepartment(departmentId) {
        const department = await Department.findById(departmentId);
        if (!department) {
            throw new Error('Department not found');
        }

        const services = await Service.find({ 
            departments: departmentId,
            isActive: true,
            isAvailable: true
        })
        .populate('departments', 'departmentName departmentCode')
        .sort({ serviceName: 1 });

        return {
            department: {
                id: department._id,
                name: department.departmentName
            },
            services: services,
            count: services.length
        };
    }
}

// Export singleton instance
export default new ServiceService();
