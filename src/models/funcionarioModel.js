var database = require("../database/config");

// Dados de um usuário (empresa e nível), usados para validar permissões
function buscarUsuario(idUsuario) {
    var instrucaoSql = `
        SELECT id_usuario, id_empresa, nivel_acesso
        FROM usuario
        WHERE id_usuario = ? AND status_usuario = TRUE;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Lista os funcionários da mesma empresa do usuário logado
function listar(idUsuario) {
    var instrucaoSql = `
        SELECT f.id_usuario, f.nome, f.email, f.cargo, f.nivel_acesso
        FROM usuario f
        WHERE f.id_empresa = (SELECT id_empresa FROM usuario WHERE id_usuario = ?)
        AND f.status_usuario = TRUE
        ORDER BY f.nome;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

function adicionar(idEmpresa, nome, email, senha, cargo, nivelAcesso) {
    var instrucaoSql = `
        INSERT INTO usuario (id_empresa, nome, email, senha, cargo, nivel_acesso)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    return database.executar(instrucaoSql, [idEmpresa, nome, email, senha, cargo, nivelAcesso]);
}

function editar(idFuncionario, nome, email, cargo, nivelAcesso) {
    var instrucaoSql = `
        UPDATE usuario
        SET nome = ?, email = ?, cargo = ?, nivel_acesso = ?
        WHERE id_usuario = ?;
    `;
    return database.executar(instrucaoSql, [nome, email, cargo, nivelAcesso, idFuncionario]);
}

function excluir(idFuncionario) {
    var instrucaoSql = `DELETE FROM usuario WHERE id_usuario = ?;`;
    return database.executar(instrucaoSql, [idFuncionario]);
}

module.exports = {
    buscarUsuario,
    listar,
    adicionar,
    editar,
    excluir
};
