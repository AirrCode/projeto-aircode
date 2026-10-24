var database = require("../database/config");

function listarPendentes() {
    var instrucaoSql = `
        SELECT
            e.id_empresa,
            e.razao_social,
            e.cnpj,
            e.setor_atuacao,
            u.nome,
            u.email,
            u.cargo
        FROM empresa e
        JOIN usuario u ON u.id_empresa = e.id_empresa
        WHERE e.status_aprovacao = 'PENDENTE'
        ORDER BY e.id_empresa DESC;
    `;
    return database.executar(instrucaoSql);
}

function atualizarStatus(idEmpresa, status) {
    var instrucaoSql = `
        UPDATE empresa
        SET status_aprovacao = ?
        WHERE id_empresa = ? AND status_aprovacao = 'PENDENTE';
    `;
    return database.executar(instrucaoSql, [status, idEmpresa]);
}

module.exports = {
    listarPendentes,
    atualizarStatus
};