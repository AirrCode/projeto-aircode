const database = require("../database/config");
const dashboardModel = require("./dashboardModel");

let tabelasProntas;

function prepararTabelas() {
    if (!tabelasProntas) {
        tabelasProntas = database.executar(`
            CREATE TABLE IF NOT EXISTS ancora_dashboard (
                id_ancora INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                nome_ancora VARCHAR(100) NOT NULL,
                indicador_alvo VARCHAR(50) NOT NULL,
                estado CHAR(2) NULL,
                posicao_top INT NULL,
                valor_alvo DECIMAL(12,2) NULL,
                operador_comparacao VARCHAR(5) NOT NULL DEFAULT '>=',
                criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_ancora_dashboard_usuario
                    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
            );
        `).then(function () {
            return database.executar(`
                CREATE TABLE IF NOT EXISTS alerta_dashboard (
                    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario INT NOT NULL,
                    id_ancora INT NOT NULL,
                    nome_alerta VARCHAR(100) NOT NULL,
                    filtro_json LONGTEXT NULL,
                    mensagem_alerta TEXT NOT NULL,
                    status_alerta BOOLEAN NOT NULL DEFAULT TRUE,
                    ja_disparado BOOLEAN NOT NULL DEFAULT FALSE,
                    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_alerta_dashboard_usuario
                        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
                    CONSTRAINT fk_alerta_dashboard_ancora
                        FOREIGN KEY (id_ancora) REFERENCES ancora_dashboard(id_ancora) ON DELETE CASCADE
                );
            `);
        }).catch(function (erro) {
            tabelasProntas = null;
            throw erro;
        });
    }

    return tabelasProntas;
}

async function listarEstados() {
    await prepararTabelas();
    return database.executar(`
        SELECT DISTINCT uf, nome_estado
        FROM aeroporto
        WHERE uf IS NOT NULL
        ORDER BY nome_estado;
    `);
}

async function listarAncoras(idUsuario) {
    await prepararTabelas();
    return database.executar(`
        SELECT id_ancora, nome_ancora, indicador_alvo, estado, posicao_top,
               valor_alvo, operador_comparacao
        FROM ancora_dashboard
        WHERE id_usuario = ?
        ORDER BY criado_em DESC;
    `, [idUsuario]);
}

async function obterAncora(idUsuario, idAncora) {
    await prepararTabelas();
    const resultado = await database.executar(`
        SELECT id_ancora, nome_ancora, indicador_alvo, estado, posicao_top,
               valor_alvo, operador_comparacao
        FROM ancora_dashboard
        WHERE id_usuario = ? AND id_ancora = ?;
    `, [idUsuario, idAncora]);
    return resultado[0] || null;
}

async function salvarAncora(idUsuario, ancora) {
    await prepararTabelas();
    if (ancora.id) {
        await database.executar(`
            UPDATE ancora_dashboard
            SET nome_ancora = ?, indicador_alvo = ?, estado = ?, posicao_top = ?,
                valor_alvo = ?, operador_comparacao = ?
            WHERE id_usuario = ? AND id_ancora = ?;
        `, [
            ancora.nome,
            ancora.indicador,
            ancora.estado,
            ancora.posicao,
            ancora.valor,
            ancora.operador,
            idUsuario,
            ancora.id
        ]);
        await database.executar(
            "UPDATE alerta_dashboard SET ja_disparado = FALSE WHERE id_ancora = ? AND id_usuario = ?;",
            [ancora.id, idUsuario]
        );
        return ancora.id;
    }

    const resultado = await database.executar(`
        INSERT INTO ancora_dashboard
            (id_usuario, nome_ancora, indicador_alvo, estado, posicao_top, valor_alvo, operador_comparacao)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `, [
        idUsuario,
        ancora.nome,
        ancora.indicador,
        ancora.estado,
        ancora.posicao,
        ancora.valor,
        ancora.operador
    ]);
    return resultado.insertId;
}

async function excluirAncora(idUsuario, idAncora) {
    await prepararTabelas();
    return database.executar(
        "DELETE FROM ancora_dashboard WHERE id_usuario = ? AND id_ancora = ?;",
        [idUsuario, idAncora]
    );
}

async function listarAlertas(idUsuario) {
    await prepararTabelas();
    return database.executar(`
        SELECT a.id_alerta, a.nome_alerta, a.filtro_json, a.mensagem_alerta,
               a.status_alerta, a.id_ancora, m.nome_ancora, m.indicador_alvo
        FROM alerta_dashboard a
        JOIN ancora_dashboard m ON m.id_ancora = a.id_ancora
        WHERE a.id_usuario = ?
        ORDER BY a.criado_em DESC;
    `, [idUsuario]);
}

async function obterAlerta(idUsuario, idAlerta) {
    await prepararTabelas();
    const resultado = await database.executar(`
        SELECT id_alerta, id_ancora, nome_alerta, filtro_json, mensagem_alerta, status_alerta
        FROM alerta_dashboard
        WHERE id_usuario = ? AND id_alerta = ?;
    `, [idUsuario, idAlerta]);
    return resultado[0] || null;
}

async function salvarAlerta(idUsuario, alerta) {
    await prepararTabelas();
    const ancora = await obterAncora(idUsuario, alerta.idAncora);
    if (!ancora) {
        throw new Error("A âncora selecionada não existe.");
    }

    const filtro = alerta.filtro ? JSON.stringify(alerta.filtro) : null;
    if (alerta.id) {
        await database.executar(`
            UPDATE alerta_dashboard
            SET nome_alerta = ?, id_ancora = ?, filtro_json = ?, mensagem_alerta = ?, ja_disparado = FALSE
            WHERE id_usuario = ? AND id_alerta = ?;
        `, [alerta.nome, alerta.idAncora, filtro, alerta.mensagem, idUsuario, alerta.id]);
        return alerta.id;
    }

    const resultado = await database.executar(`
        INSERT INTO alerta_dashboard
            (id_usuario, id_ancora, nome_alerta, filtro_json, mensagem_alerta)
        VALUES (?, ?, ?, ?, ?);
    `, [idUsuario, alerta.idAncora, alerta.nome, filtro, alerta.mensagem]);
    return resultado.insertId;
}

async function alterarStatusAlerta(idUsuario, idAlerta, ativo) {
    await prepararTabelas();
    return database.executar(`
        UPDATE alerta_dashboard
        SET status_alerta = ?, ja_disparado = FALSE
        WHERE id_usuario = ? AND id_alerta = ?;
    `, [ativo, idUsuario, idAlerta]);
}

async function excluirAlerta(idUsuario, idAlerta) {
    await prepararTabelas();
    return database.executar(
        "DELETE FROM alerta_dashboard WHERE id_usuario = ? AND id_alerta = ?;",
        [idUsuario, idAlerta]
    );
}

function comparar(valor, operador, limite) {
    if (operador === ">") return valor > limite;
    if (operador === "<") return valor < limite;
    if (operador === "<=") return valor <= limite;
    if (operador === "=") return valor === limite;
    return valor >= limite;
}

async function avaliarAncora(ancora, filtro) {
    if (ancora.indicador_alvo === "destinos" || ancora.indicador_alvo === "destaque") {
        const painel = await dashboardModel.obterPainelDestinos(filtro);
        const posicao = painel.porEstado.findIndex(function (estado) {
            return estado.uf === ancora.estado;
        }) + 1;
        return posicao > 0 && posicao <= Number(ancora.posicao_top);
    }

    if (ancora.indicador_alvo === "faturamento") {
        const painel = await dashboardModel.obterPainelDestinos(filtro);
        return comparar(
            Number(painel.totais.faturamentoEstimado),
            ancora.operador_comparacao,
            Number(ancora.valor_alvo)
        );
    }

    const painel = await dashboardModel.obterPainelCompanhias(filtro);
    let valorAtual;

    if (ancora.indicador_alvo === "avaliacao") {
        valorAtual = painel.totais.notaMedia === null ? null : Number(painel.totais.notaMedia);
    } else if (ancora.indicador_alvo === "resolucao") {
        valorAtual = painel.totais.taxaResolucao === null ? null : Number(painel.totais.taxaResolucao);
    } else if (ancora.indicador_alvo === "reclamacao") {
        valorAtual = Number(painel.totais.reclamacoes);
    } else if (ancora.indicador_alvo === "frequente") {
        valorAtual = Number((painel.porProblema[0] || {}).quantidade || 0);
    } else {
        return false;
    }

    return Number.isFinite(valorAtual) && comparar(
        valorAtual,
        ancora.operador_comparacao,
        Number(ancora.valor_alvo)
    );
}

async function avaliarAlertas(idUsuario) {
    await prepararTabelas();
    const alertas = await database.executar(`
        SELECT a.id_alerta, a.nome_alerta, a.filtro_json, a.mensagem_alerta,
               a.ja_disparado, m.id_ancora, m.nome_ancora, m.indicador_alvo,
               m.estado, m.posicao_top, m.valor_alvo, m.operador_comparacao
        FROM alerta_dashboard a
        JOIN ancora_dashboard m ON m.id_ancora = a.id_ancora
        WHERE a.id_usuario = ? AND a.status_alerta = TRUE;
    `, [idUsuario]);

    const disparados = [];
    for (const alerta of alertas) {
        const filtro = alerta.filtro_json ? JSON.parse(alerta.filtro_json) : {};
        const atingido = await avaliarAncora(alerta, filtro);
        if (atingido && !alerta.ja_disparado) {
            disparados.push({
                id: alerta.id_alerta,
                nome: alerta.nome_alerta,
                ancora: alerta.nome_ancora,
                mensagem: alerta.mensagem_alerta
            });
        }
        await database.executar(
            "UPDATE alerta_dashboard SET ja_disparado = ? WHERE id_alerta = ? AND id_usuario = ?;",
            [atingido, alerta.id_alerta, idUsuario]
        );
    }

    return disparados;
}

module.exports = {
    listarEstados,
    listarAncoras,
    obterAncora,
    salvarAncora,
    excluirAncora,
    listarAlertas,
    obterAlerta,
    salvarAlerta,
    alterarStatusAlerta,
    excluirAlerta,
    avaliarAlertas
};
