const { validationResult } = require("express-validator");

const mongoose = require("mongoose");
const HttpError = require("../models/http-error");

const Notificacion = require("../models/notificacion");

const createNotificacion = async (req, res, next) => {
	const { mensaje, comentario, alumno, curso } = req.body;

	const createdNotificacion = new Notificacion({
		mensaje,
		comentario,
		alumno,
		curso,
	});

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await createdNotificacion.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Creating notificacion failed, please try again.", 500);
		return next(err);
	}

	res.status(201).json(createdNotificacion);
};

const getNotificacionesByUser = async (req, res, next) => {
	const userId = req.params.userId;

	let notificaciones;
	try {
		notificaciones = await Notificacion.find({ alumno: userId }).populate({
			path: "curso",
			populate: {
				path: "profesor",
			},
		});
	} catch (err) {
		const error = new HttpError("Fetching notificaciones failed, please try again later.", 500);
		return next(error);
	}

	if (!notificaciones || notificaciones.length === 0) {
		res.json([]);
	} else {
		res.json(notificaciones.map((notificacion) => notificacion.toObject({ getters: true })));
	}
};

const deleteNotificacion = async (req, res, next) => {
	const notiId = req.params.notiId;
	let notificacion;
	try {
		notificacion = await Notificacion.findById(notiId).populate("alumno");
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete notificacion.", 500);
		return next(error);
	}

	if (!notificacion) {
		const error = new HttpError("Could not find NOTIFICACION for this id.", 404);
		return next(error);
	}

	if (notificacion.alumno.id !== req.userData.userId) {
		const error = new HttpError("Not allowed to delete notifiacion", 401);
		return next(error);
	}

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await notificacion.remove({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not delete notificacion.", 500);
		return next(error);
	}

	res.status(200).json({ message: "Deleted notificaion." });
};

exports.createNotificacion = createNotificacion;
exports.getNotificacionesByUser = getNotificacionesByUser;
exports.deleteNotificacion = deleteNotificacion;
