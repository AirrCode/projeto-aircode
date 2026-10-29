var express = require("express");
var router = express.Router();

var dashboardController = require("../controllers/dashboardController");

router.get("/filtros", function (req, res) {
    dashboardController.opcoesFiltro(req, res);
});

router.get("/destinos", function (req, res) {
    dashboardController.painelDestinos(req, res);
});

router.get("/companhias", function (req, res) {
    dashboardController.painelCompanhias(req, res);
});

module.exports = router;
