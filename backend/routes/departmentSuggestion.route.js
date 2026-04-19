import express from "express";
import {
  findDepartment,
  findDepartmentBySymptoms,
} from "../controllers/departmentSuggestion.controller.js";

const router = express.Router();

router.post("/find-department", findDepartment);
router.post("/find-by-symptoms", findDepartmentBySymptoms);

export default router;