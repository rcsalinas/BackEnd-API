const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const calificacionesControllers = require("../controllers/calificaciones-controllers");

const router = express.Router();

router.get("/:cursoId/byCurso", calificacionesControllers.getCalificacionesByCurso);

router.use(checkAuth);

router.get("/:userId/", calificacionesControllers.getCalificacionesByUser);

router.post("/", calificacionesControllers.createCalificacion);

router.delete("/:calificacionId/rechazar", calificacionesControllers.rechazarCalificacion);

router.patch("/:calificacionId/aceptar", calificacionesControllers.aceptarCalificacion);

module.exports = router;
