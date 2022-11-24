const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const fs = require("fs");
const Calificacion = require("../models/calificacion");
const Usuario = require("../models/user");
const Curso = require("../models/curso");

const createCalificacion = async (req, res, next) => {
	const { alumno, curso, comentario, rating, profesor } = req.body;

	let aux;
	try {
		aux = await Calificacion.find({ alumno: alumno, curso: curso });
	} catch (err) {
		const error = new HttpError("Creating place failed, please try again.", 500);
		return next(err);
	}

	if (aux.length > 0) {
		const error = new HttpError("Usted ya creo un comentario ", 500);
		return next(error);
	}

	let fecha = new Date();

	const createdCalificacion = new Calificacion({
		alumno,
		curso,
		comentario,
		rating,
		estado: false,
		fecha: fecha,
		profesor,
	});

	/*let cursoAux;
	try {
		cursoAux = await Curso.findById(curso);
	} catch (err) {
		const error = new HttpError("Could not find curso for provided id.", 404);
		return next(err);
	}*/

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await createdCalificacion.save({ session: sess });
		//cursoAux.calificaciones.push(createdCalificacion);
		//await cursoAux.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Creating calificacion failed, please try again.", 500);
		return next(err);
	}

	res.status(201).json(createCalificacion);
};

const getCalificacionesByUser = async (req, res, next) => {
	const userId = req.params.userId;

	let user;
	try {
		user = await Usuario.findById(userId);
	} catch (err) {
		const error = new HttpError("Fetching calificaciones for this user id failed", 500);
		return next(error);
	}

	let calificaciones;
	if (user.tipo == "estudiante") {
		try {
			calificaciones = await Calificacion.find({ alumno: userId, estado: true })
				.populate({
					path: "curso",
					populate: {
						path: "profesor",
						match: {
							id: userId,
						},
					},
				})
				.populate("alumno");
		} catch (err) {
			const error = new HttpError(
				"Fetching calificaciones failed, please try again later.",
				500
			);
			return next(error);
		}
	} else {
		try {
			calificaciones = await Calificacion.find({ profesor: userId })
				.populate({
					path: "curso",
					populate: {
						path: "profesor",
						match: {
							id: userId,
						},
					},
				})
				.populate("alumno");
		} catch (err) {
			const error = new HttpError(
				"Fetching calificaciones failed, please try again later.",
				500
			);
			return next(error);
		}
	}

	if (!calificaciones || calificaciones.length === 0) {
		res.json([]);
	} else {
		res.json(calificaciones.map((calificacion) => calificacion.toObject({ getters: true })));
	}
};

const getCalificacionesByCurso = async (req, res, next) => {
	const cursoId = req.params.cursoId;

	let calificaciones;
	try {
		calificaciones = await Calificacion.find({ curso: cursoId })
			.populate({
				path: "curso",
				populate: {
					path: "profesor",
				},
			})
			.populate("alumno");
	} catch (err) {
		const error = new HttpError("Fetching calificaciones failed, please try again later.", 500);
		return next(error);
	}

	if (!calificaciones || calificaciones.length === 0) {
		res.json([]);
	} else {
		res.json(calificaciones.map((calificacion) => calificacion.toObject({ getters: true })));
	}
};

const editarCalificacion = async (req, res, next) => {
	const calificacionId = req.params.calificacionId;

	const { comentario, rating } = req.body;
	let calificacion;
	try {
		calificacion = await Calificacion.findById(calificacionId).populate("curso");
	} catch (err) {
		const error = new HttpError("Something went wrong, could find calificacion", 500);
		return next(error);
	}
	if (rating != 0) {
		calificacion.rating = rating;
	}
	if (comentario !== "") {
		calificacion.comentario = comentario;
	}

	calificacion.estado = false;

	try {
		await calificacion.save();
		calificacion.curso.calificaciones.pull(calificacion);
		await calificacion.curso.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update calificacion", 500);
		return next(error);
	}
	res.status(201).json("EXITO");
};

const aceptarCalificacion = async (req, res, next) => {
	const calificacionId = req.params.calificacionId;

	let calificacion;
	try {
		calificacion = await Calificacion.findById(calificacionId).populate("curso");
	} catch (err) {
		const error = new HttpError("Something went wrong, could find calificacion", 500);
		return next(error);
	}

	calificacion.estado = true;

	let cursoId = calificacion.curso.id;
	let calificaciones;
	let cursoEncontrado;

	try {
		cursoEncontrado = await Curso.findById(cursoId);
	} catch (e) {
		const error = new HttpError("Something went wrong, could not find curso", 500);
		return next(error);
	}

	try {
		calificaciones = await Calificacion.find({ curso: cursoId });
	} catch (e) {
		const error = new HttpError(
			"Something went wrong, could not find calificaciones for curso",
			500
		);
		return next(error);
	}

	try {
		cursoEncontrado.rating = await obtenerPromedio(calificaciones);
	} catch (err) {
		return next(err);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await calificacion.save({ session: sess });
		cursoEncontrado.calificaciones.push(calificacion);
		await cursoEncontrado.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update calificacion.", 500);
		return next(err);
	}

	res.status(200).json(calificacion.toObject({ getters: true }));
};

const obtenerPromedio = async (calificaciones) => {
	let auxRating = 0;
	let aux = 0;

	for (let i = 0; i < calificaciones.length; i++) {
		auxRating += calificaciones[i].rating;
		aux++;
	}

	return auxRating / aux;
};

const deleteCalificacion = async (req, res, next) => {
	const calificacionId = req.params.calificacionId;
	let calificacion;
	try {
		calificacion = await Calificacion.findById(calificacionId).populate("curso");
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete calificacion.", 500);
		return next(error);
	}
	console.log(calificacion);
	if (!calificacion) {
		const error = new HttpError("Could not find calificacion for this id.", 404);
		return next(error);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();

		await calificacion.remove({ session: sess });
		calificacion.curso.calificaciones.pull(calificacion);
		await calificacion.curso.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete calificacion.", 500);
		return next(error);
	}

	res.status(200).json({ message: "Deleted calificacion." });
};

const rechazarCalificacion = async (req, res, next) => {
	const calificacionId = req.params.calificacionId;
	let calificacion;
	try {
		calificacion = await Calificacion.findById(calificacionId).populate({
			path: "curso",
			populate: {
				path: "profesor",
			},
		});
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete calificacion.", 500);
		return next(error);
	}

	if (!calificacion) {
		const error = new HttpError("Could not find calificacion for this id.", 404);
		return next(error);
	}

	if (calificacion.curso.profesor.id !== req.userData.userId) {
		const error = new HttpError("Not allowed to delete calificacion", 401);
		return next(error);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await calificacion.remove({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete calificacion.", 500);
		return next(error);
	}

	res.status(200).json({ message: "Deleted calificacion." });
};

exports.getCalificacionesByUser = getCalificacionesByUser;
exports.getCalificacionesByCurso = getCalificacionesByCurso;
exports.createCalificacion = createCalificacion;
exports.rechazarCalificacion = rechazarCalificacion;
exports.aceptarCalificacion = aceptarCalificacion;
exports.deleteCalificacion = deleteCalificacion;
exports.editarCalificacion = editarCalificacion;
