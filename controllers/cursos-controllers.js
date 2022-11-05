const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Curso = require("../models/curso");
const fs = require("fs");
const Usuario = require("../models/user");
const Contratacion = require("../models/contratacion");
const Calificacion = require("../models/calificacion");

const getCursos = async (req, res, next) => {
	let cursos;
	try {
		cursos = await Curso.find({}).populate("profesor");
	} catch (err) {
		const error = new HttpError("Fetching cursos failed, please try again later.", 500);
		return next(error);
	}
	res.json({ cursos: cursos.map((curso) => curso.toObject({ getters: true })) });
};

const getCursoById = async (req, res, next) => {
	const cursoId = req.params.cursoId;
	let curso;
	try {
		curso = await Curso.findById(cursoId)
			.populate("profesor")
			.populate({
				path: "calificaciones",
				populate: {
					path: "alumno",
				},
			});
	} catch (err) {
		const error = new HttpError("Something went wrong, could not find a place.", 500);
		return next(err);
	}

	if (!curso) {
		const error = new HttpError("Could not find curso for the provided id.", 404);
		return next(error);
	}

	res.json(curso.toObject({ getters: true }));
};

const createCurso = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new HttpError("Invalid inputs passed, please check your data.", 422));
	}

	const { nombre, descripcion, duracion, frecuencia, tipo, costo } = req.body;
	let imagePath;
	if (req.file === undefined) {
		imagePath = "uploads/images/CursoGeneric.png";
	} else {
		imagePath = req.file.path;
	}

	const createdCurso = new Curso({
		nombre,
		descripcion,
		image: imagePath,
		estado: true,
		duracion,
		frecuencia,
		tipo,
		costo,
		rating: 5,
		profesor: req.userData.userId,
		calificaciones: [],
	});

	let user;
	try {
		user = await Usuario.findById(req.userData.userId);
	} catch (err) {
		const error = new HttpError("Creating user failed, please try again.", 500);
		return next(error);
	}

	if (!user) {
		const error = new HttpError("Could not find user for provided id.", 404);
		return next(error);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await createdCurso.save({ session: sess });
		user.cursos.push(createdCurso);
		await user.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Creating curso failed, please try again.", 500);
		return next(err);
	}

	res.status(201).json({ curso: createdCurso });
};

const getCursosByUserId = async (req, res, next) => {
	const userId = req.params.userId;

	let userWithCursos;
	try {
		userWithCursos = await Usuario.findById(userId).populate({
			path: "cursos",
			populate: {
				path: "profesor",
			},
		});
	} catch (err) {
		const error = new HttpError("Fetching cursos failed, please try again later.", 500);
		return next(error);
	}

	// if (!places || places.length === 0) {
	if (!userWithCursos || userWithCursos.cursos.length === 0) {
		res.json([]);
	} else {
		res.json(userWithCursos.cursos.map((curso) => curso.toObject({ getters: true })));
	}
};

const updateCurso = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new HttpError("Invalid inputs passed, please check your data.", 422));
	}

	const { nombre, descripcion, duracion, frecuencia, tipo, costo } = req.body;

	const cursoId = req.params.cursoId;

	let curso;
	try {
		curso = await Curso.findById(cursoId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update curso.", 500);
		return next(error);
	}
	let imagePath;
	if (req.file) {
		imagePath = curso.image;
		try {
			fs.unlink(imagePath, (err) => {
				console.log(err);
			});
		} catch (error) {
			console.log(error);
		}

		curso.image = req.file.path;
	}

	curso.nombre = nombre;
	curso.descripcion = descripcion;
	curso.duracion = duracion;
	curso.frecuencia = frecuencia;
	curso.tipo = tipo;
	curso.costo = costo;

	try {
		await curso.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update curso.", 500);
		return next(error);
	}

	res.status(200).json(curso.toObject({ getters: true }));
};

const publicarCursoPorId = async (req, res, next) => {
	const cursoId = req.params.cursoId;

	let curso;
	try {
		curso = await Curso.findById(cursoId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could find curso", 500);
		return next(err);
	}

	curso.estado = true;

	try {
		await curso.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not publish contratacion.", 500);
		return next(err);
	}

	res.status(200).json(curso.toObject({ getters: true }));
};

const despublicarCursoPorId = async (req, res, next) => {
	const cursoId = req.params.cursoId;

	let curso;
	try {
		curso = await Curso.findById(cursoId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could find curso", 500);
		return next(err);
	}

	curso.estado = false;

	try {
		await curso.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not unpublish contratacion.", 500);
		return next(err);
	}

	res.status(200).json(curso.toObject({ getters: true }));
};

const eliminarCursoPorId = async (req, res, next) => {
	const cursoId = req.params.cursoId;

	let curso;
	try {
		curso = await Curso.findById(cursoId).populate("profesor");
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete curso.", 500);
		return next(err);
	}

	if (!curso) {
		const error = new HttpError("Could not find curso for this id.", 404);
		return next(err);
	}

	if (curso.profesor.id !== req.userData.userId) {
		const error = new HttpError("Not allowed to delete curso", 401);
		return next(error);
	}

	const imagePath = curso.image;

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await curso.remove({ session: sess });
		await Contratacion.deleteMany({ curso: cursoId });
		await Calificacion.deleteMany({ curso: cursoId });
		curso.profesor.cursos.pull(curso);
		await curso.profesor.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete curso.", 500);
		return next(err);
	}
	if (imagePath !== "uploads/images/CursoGeneric.png") {
		fs.unlink(imagePath, (err) => {
			console.log(err);
		});
	}

	res.status(200).json({ message: "Deleted curso." });
};

exports.getCursos = getCursos;
exports.getCursoById = getCursoById;
exports.createCurso = createCurso;
exports.getCursosByUserId = getCursosByUserId;
exports.updateCurso = updateCurso;
exports.publicarCursoPorId = publicarCursoPorId;
exports.despublicarCursoPorId = despublicarCursoPorId;
exports.eliminarCursoPorId = eliminarCursoPorId;
