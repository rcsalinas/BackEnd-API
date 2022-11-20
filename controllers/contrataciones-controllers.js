const { validationResult } = require("express-validator");

const mongoose = require("mongoose");
const HttpError = require("../models/http-error");

const Contratacion = require("../models/contratacion");

const createContratacion = async (req, res, next) => {
	const cursoId = req.params.cursoId;
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new HttpError("Invalid inputs passed, please check your data.", 422));
	}

	const { motivacion, email, telefono, horario, profesor } = req.body;

	const createdContratacion = new Contratacion({
		motivacion,
		estadoContratacion: "Espera", //Aceptada,Espera,Finalizada
		email,
		telefono,
		horario,
		alumno: req.userData.userId,
		curso: cursoId,
		profesor: profesor,
	});

	let contratacion;
	try {
		contratacion = await Contratacion.find({ alumno: req.userData.userId, curso: cursoId });
	} catch (err) {
		const error = new HttpError("Error al crear contratacion", 500);
		return next(error);
	}

	if (contratacion != null && contratacion.length > 0) {
		const error = new HttpError("Ya existe una contratacion para este curso", 500);
		return next(error);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await createdContratacion.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Creating contratacion failed, please try again.", 500);
		return next(err);
	}

	res.status(201).json(createContratacion);
};

const getContratacionesByUserId = async (req, res, next) => {
	const userId = req.params.userId;

	let contrataciones;
	try {
		contrataciones = await Contratacion.find({
			$or: [{ alumno: userId }, { profesor: userId }],
		})
			.populate("curso")
			.populate("alumno")
			.populate("profesor");
	} catch (err) {
		const error = new HttpError("Fetching contrataciones failed, please try again later.", 500);
		return next(error);
	}

	if (!contrataciones || contrataciones.length === 0) {
		res.json([]);
	} else {
		res.json(contrataciones.map((contratacion) => contratacion.toObject({ getters: true })));
	}
};

const finalizarContratacionPorId = async (req, res, next) => {
	const contratacionId = req.params.contratacionId;

	let contratacion;
	try {
		contratacion = await Contratacion.findById(contratacionId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could find contratacion", 500);
		return next(err);
	}

	contratacion.estadoContratacion = "Finalizada";

	try {
		await contratacion.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not finalizar contratacion.", 500);
		return next(err);
	}

	res.status(200).json(contratacion.toObject({ getters: true }));
};

const aceptarContratacion = async (req, res, next) => {
	const contratacionId = req.params.contratacionId;

	let contratacion;
	try {
		contratacion = await Contratacion.findById(contratacionId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could find contratacion", 500);
		return next(err);
	}

	contratacion.estadoContratacion = "Aceptada";

	try {
		await contratacion.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not finalizar contratacion.", 500);
		return next(err);
	}

	res.status(200).json(contratacion.toObject({ getters: true }));
};

const rechazarContratacion = async (req, res, next) => {
	const contratacionId = req.params.contratacionId;
	let contratacion;
	try {
		contratacion = await Contratacion.findById(contratacionId).populate("profesor");
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete contratacion.", 500);
		return next(error);
	}

	if (!contratacion) {
		const error = new HttpError("Could not find contratacion for this id.", 404);
		return next(error);
	}

	if (contratacion.profesor.id !== req.userData.userId) {
		const error = new HttpError("Not allowed to delete contratacion", 401);
		return next(error);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await contratacion.remove({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete place.", 500);
		return next(error);
	}

	res.status(200).json({ message: "Deleted contratacion." });
};
exports.createContratacion = createContratacion;
exports.getContratacionesByUserId = getContratacionesByUserId;
exports.finalizarContratacionPorId = finalizarContratacionPorId;
exports.aceptarContratacion = aceptarContratacion;
exports.rechazarContratacion = rechazarContratacion;
