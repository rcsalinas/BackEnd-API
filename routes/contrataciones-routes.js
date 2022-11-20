const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const contratacionesControllers = require("../controllers/contrataciones-controllers");

const router = express.Router();

router.use(checkAuth);

router.get("/user/:userId", contratacionesControllers.getContratacionesByUserId);

router.get("/user/:userId/:cursoId", contratacionesControllers.getContratacionByCurso);

router.patch("/:contratacionId/finalizar", contratacionesControllers.finalizarContratacionPorId);

router.patch("/:contratacionId/aceptar", contratacionesControllers.aceptarContratacion);

router.delete("/:contratacionId/rechazar", contratacionesControllers.rechazarContratacion);

router.post("/:cursoId", contratacionesControllers.createContratacion);

module.exports = router;
