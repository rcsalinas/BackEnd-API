const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const usuarioSchema = new Schema({
	nombre: { type: String, required: true },
	apellido: { type: String, required: true },
	telefono: { type: String, required: true },
	tipo: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true, minlength: 6 },
	image: { type: String },
	cursos: [{ type: mongoose.Types.ObjectId, required: true, ref: "Curso" }],
	fechaNacimiento: { type: String },
	estudiosCursados: [
		{
			type: String,
		},
	],
	titulo: { type: String },
	experiencia: { type: String },
});

usuarioSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Usuario", usuarioSchema);
