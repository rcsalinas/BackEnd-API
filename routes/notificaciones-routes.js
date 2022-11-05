const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const notificacionesControllers = require("../controllers/notificaciones-controllers");

const router = express.Router();

router.use(checkAuth);

router.get("/:userId", notificacionesControllers.getNotificacionesByUser);

router.post("/", notificacionesControllers.createNotificacion);

router.delete("/:notiId", notificacionesControllers.deleteNotificacion);

module.exports = router;
