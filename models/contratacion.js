const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const contratacionSchema = new Schema({
	motivacion: { type: String, required: true },
	estadoContratacion: { type: String, required: true },
	email: { type: String, required: true },
	telefono: { type: String, required: true },
	horario: { type: String, required: true },
	alumno: { type: mongoose.Types.ObjectId, required: true, ref: "Usuario" },
	profesor: { type: mongoose.Types.ObjectId, required: true, ref: "Usuario" },
	curso: { type: mongoose.Types.ObjectId, required: true, ref: "Curso" },
});

module.exports = mongoose.model("Contratacion", contratacionSchema);
