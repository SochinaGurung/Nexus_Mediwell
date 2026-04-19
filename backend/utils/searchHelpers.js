/**
 * Escape a string for safe use inside a MongoDB $regex pattern.
 */
export function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a { $or: [...] } condition for user-style fields (name, username, email).
 * Supports multi-word queries as firstName + lastName (e.g. "Jane Doe").
 */
export function userTextSearchCondition(rawSearch) {
    const search = String(rawSearch || "").trim();
    if (!search) return null;

    const escapedFull = escapeRegex(search);
    const parts = search.split(/\s+/).filter(Boolean);

    const orClauses = [
        { username: { $regex: escapedFull, $options: "i" } },
        { email: { $regex: escapedFull, $options: "i" } },
        { firstName: { $regex: escapedFull, $options: "i" } },
        { lastName: { $regex: escapedFull, $options: "i" } },
    ];

    if (parts.length >= 2) {
        const first = escapeRegex(parts[0]);
        const last = escapeRegex(parts.slice(1).join(" "));
        orClauses.push({
            $and: [
                { firstName: { $regex: first, $options: "i" } },
                { lastName: { $regex: last, $options: "i" } },
            ],
        });
    }

    return { $or: orClauses };
}
