var aprovacaoModel = require("../models/aprovacaoModel");

function listarPendentes(req, res) {
    aprovacaoModel.listarPendentes()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log("Erro ao listar pendentes: ", erro.sqlMessage);
            res.status(500).json({ mensagem: "Erro ao buscar as solicitações." });
        });
}

function decidir(req, res, status, mensagemSucesso) {
    var idEmpresa = Number(req.params.idEmpresa);

    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
        return res.status(400).json({ mensagem: "ID da empresa inválido." });
    }

    aprovacaoModel.atualizarStatus(idEmpresa, status)
        .then(function (resultado) {
            if (resultado.affectedRows == 0) {
                res.status(404).json({ mensagem: "Solicitação não encontrada ou já avaliada." });
            } else {
                res.status(200).json({ mensagem: mensagemSucesso });
            }
        })
        .catch(function (erro) {
            console.log("Erro ao atualizar status: ", erro.sqlMessage);
            res.status(500).json({ mensagem: "Erro ao atualizar a solicitação." });
        });
}

function aprovar(req, res) {
    decidir(req, res, "APROVADO", "Empresa aprovada com sucesso!");
}

function rejeitar(req, res) {
    decidir(req, res, "RECUSADO", "Empresa recusada.");
}

module.exports = {
    listarPendentes,
    aprovar,
    rejeitar
};