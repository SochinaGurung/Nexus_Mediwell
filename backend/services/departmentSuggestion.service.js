import express from 'express';
import { suggestDepartment } from '../services/departmentSuggestion.service.js';

const router = express.Router();

router.post("/suggest", async (req, res) => {
    const { symptoms } = req.body;

    if (!symptoms) {
        return res.status(400).json({ error: "Symptoms are required" });
    }

    try {
        const result = await suggestDepartment(symptoms);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

export default router;