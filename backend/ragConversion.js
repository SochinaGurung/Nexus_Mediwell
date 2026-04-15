import fs from "fs";

// Reads the JSON file manually
const rawData = fs.readFileSync("./data/SymptomsDepartment.json", "utf-8");
const data = JSON.parse(rawData);

// Converting to RAG format
const newData = data.map(item => ({
  text: `A patient is experiencing ${item.symptoms}. This may indicate ${item.disease}. The patient should visit the ${item.department} department.`,
  disease: item.disease,
  department: item.department
}));

// Saving it in a new file
fs.writeFileSync("rag_data.json", JSON.stringify(newData, null, 2));

console.log(" Converted successfully!");