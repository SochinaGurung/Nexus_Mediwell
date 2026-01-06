import jwt from "jsonwebtoken";

// auth.middleware.js
export function protect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // contains userId, username & role
    } catch (err) {
        return res.status(401).json({ message: "Token invalid" });
    }
}

export function allowRoles(...roles) {
    return (req, res) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
    };
}

// Optional authentication - sets req.user if token is provided, but doesn't require it
export function optionalAuth(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // No token provided - continue without setting req.user
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // contains userId, username & role
    } catch (err) {
        // Invalid token - continue without setting req.user
    }
}
