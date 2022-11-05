const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const notificacionSchema = new Schema({
	mensaje: { type: String, required: true },
	comentario: { type: String, required: true },
	alumno: { type: mongoose.Types.ObjectId, required: true, ref: "Usuario" },
	curso: { type: mongoose.Types.ObjectId, required: true, ref: "Curso" },
});

module.exports = mongoose.model("Notificacion", notificacionSchema);
