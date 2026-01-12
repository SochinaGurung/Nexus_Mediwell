import jwt from "jsonwebtoken";

// Protect routes (requires login)
export function protect(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // contains userId, username & role
        next(); // Important!
    } catch (err) {
        return res.status(401).json({ message: "Token invalid" });
    }
}

// Role-based access control
export function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next(); // Important!
    };
}

// Optional authentication (sets req.user if token is valid)
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(); // No token, just continue
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // contains userId, username & role
    } catch (err) {
        // Invalid token - just continue without req.user
    }
    next(); // Always call next
}
