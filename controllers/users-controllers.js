const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Usuario = require("../models/user");
const fs = require("fs");
let nodemailer = require("nodemailer");

const signup = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new HttpError("Invalid inputs passed, please check your data.", 422));
	}

	let existingUser;
	try {
		existingUser = await Usuario.findOne({ email: req.body.email });
	} catch (err) {
		const error = new HttpError("Signing up failed, please try again later.", 500);
		return next(err);
	}

	if (existingUser !== null) {
		const error = new HttpError("User exists already, please login instead.", 422);
		return next(error);
	}

	let hashedPassword;

	try {
		hashedPassword = await bcrypt.hash(req.body.password, 12);
	} catch (err) {
		const error = new HttpError("Could not create user please try again", 500);
		return next(err);
	}
	let createdUser;
	let imagePath;

	if (req.file === undefined) {
		imagePath = "uploads/images/UserGeneric.png";
	} else {
		imagePath = req.file.path;
	}
	if (req.body.tipo === "estudiante") {
		let estudiosConversion = req.body.estudiosCursados.split(",");

		createdUser = new Usuario({
			nombre: req.body.nombre,
			apellido: req.body.apellido,
			telefono: req.body.telefono,
			tipo: req.body.tipo,
			email: req.body.email,
			password: hashedPassword,
			image: imagePath,
			cursos: [],
			fechaNacimiento: req.body.fechaNacimiento,
			estudiosCursados: estudiosConversion,
		});
	}
	if (req.body.tipo === "profesor") {
		createdUser = new Usuario({
			nombre: req.body.nombre,
			apellido: req.body.apellido,
			telefono: req.body.telefono,
			tipo: req.body.tipo,
			email: req.body.email,
			password: hashedPassword,
			image: imagePath,
			cursos: [],
			titulo: req.body.titulo,
			experiencia: req.body.experiencia,
		});
	}

	try {
		await createdUser.save();
	} catch (err) {
		const error = new HttpError("Signing up failed, please try again later.", 500);
		return next(err);
	}

	let token;
	try {
		token = jwt.sign(
			{ userId: createdUser.id, email: createdUser.email },
			process.env.JWT_KEY,
			{ expiresIn: "1h" }
		);
	} catch (err) {
		const error = new HttpError("Signing up failed, please try again later.", 500);
		return next(err);
	}

	res.status(201).json({
		userId: createdUser.id,
		email: createdUser.email,
		token: token,
		tipo: createdUser.tipo,
	});
};

const login = async (req, res, next) => {
	const { email, password } = req.body;

	let existingUser;

	try {
		existingUser = await Usuario.findOne({ email: email });
	} catch (err) {
		const error = new HttpError("Login failed, please try again later.", 500);
		return next(err);
	}

	if (!existingUser) {
		const error = new HttpError("Invalid credentials, could not log you in.", 401);
		return next(error);
	}

	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(password, existingUser.password);
	} catch (err) {
		const error = new HttpError("Invalid credentials, could not log you in.", 500);
		return next(error);
	}
	if (!isValidPassword) {
		const error = new HttpError("Invalid credentials, could not log you in.", 401);
		return next(error);
	}

	let token;
	try {
		token = jwt.sign(
			{ userId: existingUser.id, email: existingUser.email },
			process.env.JWT_KEY,
			{ expiresIn: "1h" }
		);
	} catch (err) {
		const error = new HttpError("Logging in failed, please try again later.", 500);
		return next(err);
	}

	res.json({
		userId: existingUser.id,
		email: existingUser.email,
		token: token,
		tipo: existingUser.tipo,
	});
};

const getUserById = async (req, res, next) => {
	const userId = req.params.userId;
	let user;
	try {
		user = await Usuario.findById(userId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could not find a place.", 500);
		return next(err);
	}

	if (!user) {
		const error = new HttpError("Could not find user for the provided id.", 404);
		return next(error);
	}

	res.json({ user: user.toObject({ getters: true }) });
};

const updateUser = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new HttpError("Invalid inputs passed, please check your data.", 422));
	}

	const { nombre, apellido, telefono, email, tipo } = req.body;
	let fechaNacimiento;
	let estudiosCursados;
	let titulo;
	let experiencia;

	const userId = req.params.userId;

	let user;
	try {
		user = await Usuario.findById(userId);
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update user.", 500);
		return next(error);
	}
	let imagePath;
	if (req.file) {
		imagePath = user.image;
		if (imagePath !== "uploads/images/UserGeneric.png") {
			try {
				fs.unlink(imagePath, (err) => {
					console.log(err);
				});
			} catch (error) {
				console.log(error);
			}
		}

		user.image = req.file.path;
	}

	user.nombre = nombre;
	user.apellido = apellido;
	user.email = email;
	user.telefono = telefono;

	if (user.tipo === "estudiante") {
		estudiosCursados = req.body.estudiosCursados.split(",");
		fechaNacimiento = req.body.fechaNacimiento;
		user.estudiosCursados = estudiosCursados;
		user.fechaNacimiento = fechaNacimiento;
	} else {
		titulo = req.body.titulo;
		experiencia = req.body.experiencia;
		user.titulo = titulo;
		user.experiencia = experiencia;
	}

	try {
		await user.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update user.", 500);
		return next(error);
	}

	res.status(200).json({ user: user.toObject({ getters: true }) });
};

const sendMailForgotPassword = async (req, res, next) => {
	const { email } = req.body;
	let user;

	try {
		user = await Usuario.findOne({ email: email });
	} catch (err) {
		const error = new HttpError("Could  not find user for the provided email", 500);
		return next(err);
	}

	if (!user) {
		return res.status(409).send({ message: "User with given email does not exist!" });
	}

	const secret = process.env.JWT_KEY + user.password;

	const payload = {
		email: user.email,
		id: user.id,
	};
	const token = jwt.sign(payload, secret, { expiresIn: "15m" });

	let link = `http://localhost:3000/resetPassword/${user.id}/${token}`;

	//enviar email

	var transporter = nodemailer.createTransport({
		secure: true,
		port: process.env.SMTP_PORT,
		service: "gmail",
		host: "smtp.gmail.com",
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASSWORD,
		},
	});
	// Definimos el email
	var mailOptions = {
		from: "robertosalinasaguilar99@gmail.com",
		to: email,
		subject: "Reset Password TeachersMarket",
		html: `<h3><u>IMPORTANTE:</u></h3><p>Ingrese Al siguiente link para cambiar su contraseña</p><a href='${link}'>Entre aqui</a>`,
	};
	console.log("mail", mailOptions);
	// Enviamos el email
	try {
		let info = await transporter.sendMail(mailOptions);
		console.log("Message sent: %s", info.messageId);
		res.status(200).json({ message: "Enviado el mail con exito" });
	} catch (err) {
		console.log("Error envio mail: ", err);
		const error = new HttpError("Could not send email", 500);
		return next(error);
	}
};

const resetPassword = async (req, res, next) => {
	const { userId, token, password } = req.body;

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return next(new HttpError("Invalid inputs passed, please check your data.", 422));
	}

	let user;
	try {
		user = await Usuario.findById(userId);
	} catch (err) {
		const error = new HttpError("Could not find user by that id", 500);
		return next(error);
	}

	const secret = process.env.JWT_KEY + user.password;

	const payload = jwt.verify(token, secret);
	let hashedPassword;

	try {
		hashedPassword = await bcrypt.hash(password, 12);
	} catch (err) {
		const error = new HttpError("Could not create user please try again", 500);
		return next(err);
	}
	user.password = hashedPassword;

	try {
		await user.save();
	} catch (err) {
		const error = new HttpError("Something went wrong, could not update password.", 500);
		return next(error);
	}

	res.status(200).json({ message: "Contraseña cambiada con exito" });
};

exports.signup = signup;
exports.login = login;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.sendMailForgotPassword = sendMailForgotPassword;
exports.resetPassword = resetPassword;
