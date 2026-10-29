var dashboardModel = require("../models/dashboardModel");

function lerFiltro(req) {
    var estados = req.query.estados;
    var companhias = req.query.companhias;
    if (!Array.isArray(estados)) {
        estados = estados ? [estados] : [];
    }
    if (!Array.isArray(companhias)) {
        companhias = companhias ? [companhias] : [];
    }

    return {
        estados: estados,
        companhias: companhias,
        estado: req.query.estado,
        companhia: req.query.companhia,
        problema: req.query.problema,
        dataInicial: req.query.dataInicial,
        dataFinal: req.query.dataFinal
    };
}

function responderErro(res, erro, mensagem) {
    console.log(mensagem, erro.sqlMessage || erro.message);

    var detalhe = erro.code == "ECONNREFUSED"
        ? "Nao foi possivel conectar ao banco de dados. Verifique se o MySQL esta ligado."
        : mensagem;

    res.status(500).json({ mensagem: detalhe });
}

function opcoesFiltro(req, res) {
    dashboardModel.listarOpcoesFiltro()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            responderErro(res, erro, "Erro ao carregar as opcoes de filtro.");
        });
}

function painelDestinos(req, res) {
    dashboardModel.obterPainelDestinos(lerFiltro(req))
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            responderErro(res, erro, "Erro ao carregar o painel de destinos.");
        });
}

function painelCompanhias(req, res) {
    dashboardModel.obterPainelCompanhias(lerFiltro(req))
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            responderErro(res, erro, "Erro ao carregar o painel de companhias.");
        });
}

module.exports = {
    opcoesFiltro,
    painelDestinos,
    painelCompanhias
};
