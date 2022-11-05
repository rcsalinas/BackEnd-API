const express = require("express");
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");
const usersController = require("../controllers/users-controllers");

const router = express.Router();

router.get("/:userId", usersController.getUserById);

router.post(
	"/signup",
	fileUpload.single("image"),
	[
		check("nombre").not().isEmpty(),
		check("email").normalizeEmail().isEmail(),
		check("password").isLength({ min: 6 }),
	],
	usersController.signup
);

router.post("/login", usersController.login);

router.post("/forgot-password", usersController.sendMailForgotPassword); //con este voy a mandar el mail

router.post("/reset-password", usersController.resetPassword, [
	check("password").isLength({ min: 6 }),
]); //aqui van a venir los datos con la nueva contraseña

router.use(checkAuth);
router.patch("/:userId", fileUpload.single("image"), usersController.updateUser);

module.exports = router;
