import User from '../models/user.model.js';

async function doctorDisplayNameMap(idStrings) {
    const map = {};
    if (!idStrings.length) return map;
    const doctors = await User.find({
        _id: { $in: idStrings },
        role: 'doctor',
    })
        .select('firstName lastName username')
        .lean();
    for (const d of doctors) {
        map[String(d._id)] =
            `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.username || null;
    }
    return map;
}

function entryToPlain(entry) {
    if (entry == null) return null;
    if (typeof entry.toObject === 'function') return entry.toObject();
    return { ...entry };
}

/**
 * Returns a JSON-safe array of history entries with an extra `doctorName` field (not stored in DB).
 */
export async function attachDoctorNamesToMedicalHistory(medicalHistory) {
    if (!Array.isArray(medicalHistory) || medicalHistory.length === 0) return [];

    const plain = medicalHistory.map(entryToPlain).filter(Boolean);
    const ids = [
        ...new Set(plain.map((e) => (e.doctorId ? String(e.doctorId) : null)).filter(Boolean)),
    ];
    const doctorMap = await doctorDisplayNameMap(ids);

    return plain.map((e) => {
        const did = e.doctorId ? String(e.doctorId) : null;
        return {
            ...e,
            doctorName: did ? doctorMap[did] ?? null : null,
        };
    });
}

/**
 * One doctor lookup for many patients (e.g. search). Returns parallel array of enriched histories.
 */
export async function attachDoctorNamesForSearchPatients(patients) {
    const allIds = new Set();
    for (const p of patients) {
        for (const e of p.medicalHistory || []) {
            if (e && e.doctorId) allIds.add(String(e.doctorId));
        }
    }
    const doctorMap = await doctorDisplayNameMap([...allIds]);

    return patients.map((patient) => {
        const plainHistory = (patient.medicalHistory || []).map(entryToPlain).filter(Boolean);
        const medicalHistory = plainHistory.map((e) => {
            const did = e.doctorId ? String(e.doctorId) : null;
            return {
                ...e,
                doctorName: did ? doctorMap[did] ?? null : null,
            };
        });
        return { patient, medicalHistory };
    });
}
