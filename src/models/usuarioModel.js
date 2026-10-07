var database = require("../database/config")

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email, senha)
    var instrucaoSql = `
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.cargo,
            u.status_usuario,
            e.cnpj,
            e.status_aprovacao
        FROM usuario u
        JOIN empresa e ON e.id_empresa = u.id_empresa
        WHERE u.email = ? AND u.senha = ?;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql, [email, senha]);
}

// Coloque os mesmos parâmetros aqui. Vá para a var instrucaoSql
function cadastrar(nome, email, senha, cnpj, razaoSocial, cargo) {
    return database.executarTransacao(async function (executar) {
        var resultadoEmpresa = await executar(
            "INSERT INTO empresa (razao_social, cnpj) VALUES (?, ?)",
            [razaoSocial, cnpj]
        );
        return executar(
            "INSERT INTO usuario (id_empresa, nome, email, senha, cargo) VALUES (?, ?, ?, ?, ?)",
            [resultadoEmpresa.insertId, nome, email, senha, cargo]
        );
    });
}

module.exports = {
    autenticar,
    cadastrar
};
