const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const calificacionSchema = new Schema({
	comentario: { type: String, required: true },
	fecha: { type: String, required: true },
	rating: { type: Number, required: true },
	estado: { type: Boolean, required: true },
	alumno: { type: mongoose.Types.ObjectId, required: true, ref: "Usuario" },
	curso: { type: mongoose.Types.ObjectId, required: true, ref: "Curso" },
});

module.exports = mongoose.model("Calificacion", calificacionSchema);
