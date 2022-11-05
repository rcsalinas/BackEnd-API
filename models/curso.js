const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const cursoSchema = new Schema({
	nombre: { type: String, required: true },
	descripcion: { type: String, required: true },
	image: { type: String, required: true },
	estado: { type: Boolean, required: true },
	duracion: { type: String, required: true },
	frecuencia: { type: String, required: true },
	tipo: { type: String, required: true },
	costo: { type: Number, required: true },
	rating: { type: Number, min: 0, max: 5 },
	profesor: { type: mongoose.Types.ObjectId, required: true, ref: "Usuario" },
	calificaciones: [{ type: mongoose.Types.ObjectId, required: true, ref: "Calificacion" }],
});

module.exports = mongoose.model("Curso", cursoSchema);
