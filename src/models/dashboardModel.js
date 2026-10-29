const database = require("../database/config");

const PRECO_MEDIO_PASSAGEM = 660.54;

function obterDatasDoPeriodo(filtro) {
    if (filtro.dataInicial || filtro.dataFinal) {
        return {
            dataInicial: filtro.dataInicial || null,
            dataFinal: filtro.dataFinal || null
        };
    }

    return {
        dataInicial: "2025-10-01",
        dataFinal: "2025-10-31"
    };
}

function montarPeriodo(filtro) {
    const datas = obterDatasDoPeriodo(filtro);
    const inicio = datas.dataInicial
        ? Number(datas.dataInicial.slice(0, 7).replace("-", ""))
        : null;
    const fim = datas.dataFinal
        ? Number(datas.dataFinal.slice(0, 7).replace("-", ""))
        : null;

    return { inicio, fim };
}

function montarCondicoes(condicoes, valores) {
    return {
        sql: condicoes.length ? ` AND ${condicoes.join(" AND ")}` : "",
        valores
    };
}

function obterEstadosDoFiltro(filtro) {
    if (Array.isArray(filtro.estados) && filtro.estados.length) {
        return filtro.estados.filter(function (estado, indice, estados) {
            return typeof estado === "string" && estado !== "TODOS" && estados.indexOf(estado) === indice;
        });
    }

    return filtro.estado && filtro.estado !== "TODOS" ? [filtro.estado] : [];
}

function obterCompanhiasDoFiltro(filtro) {
    if (Array.isArray(filtro.companhias) && filtro.companhias.length) {
        return filtro.companhias.filter(function (companhia, indice, companhias) {
            return companhia !== "TODAS" && companhias.indexOf(companhia) === indice;
        });
    }

    return filtro.companhia && filtro.companhia !== "TODAS" ? [filtro.companhia] : [];
}

function adicionarCondicaoCompanhias(condicoes, valores, companhias) {
    if (companhias.length === 0) {
        return;
    }

    const nomeCompanhia = "COALESCE(c.nome_fantasia_consumidor, c.nome_empresa)";
    condicoes.push(`(${companhias.map(function () {
        return `(c.id_companhia = ? OR ${nomeCompanhia} = ?)`;
    }).join(" OR ")})`);
    companhias.forEach(function (companhia) {
        valores.push(companhia, companhia);
    });
}

function condicoesVoos(filtro) {
    const condicoes = [];
    const valores = [];
    const estados = obterEstadosDoFiltro(filtro);

    if (estados.length === 1) {
        condicoes.push("destino.uf = ?");
        valores.push(estados[0]);
    } else if (estados.length > 1) {
        condicoes.push(`destino.uf IN (${estados.map(function () { return "?"; }).join(", ")})`);
        valores.push(...estados);
    }

    const companhias = obterCompanhiasDoFiltro(filtro);
    adicionarCondicaoCompanhias(condicoes, valores, companhias);

    const periodo = montarPeriodo(filtro);

    if (periodo.inicio !== null) {
        condicoes.push("(v.ano * 100 + v.mes) >= ?");
        valores.push(periodo.inicio);
    }

    if (periodo.fim !== null) {
        condicoes.push("(v.ano * 100 + v.mes) <= ?");
        valores.push(periodo.fim);
    }

    return montarCondicoes(condicoes, valores);
}

function condicoesReclamacoes(filtro) {
    const condicoes = [];
    const valores = [];
    const estados = obterEstadosDoFiltro(filtro);
    const periodo = obterDatasDoPeriodo(filtro);

    if (estados.length === 1) {
        condicoes.push("r.uf_consumidor = ?");
        valores.push(estados[0]);
    } else if (estados.length > 1) {
        condicoes.push(`r.uf_consumidor IN (${estados.map(function () { return "?"; }).join(", ")})`);
        valores.push(...estados);
    }

    const companhias = obterCompanhiasDoFiltro(filtro);
    adicionarCondicaoCompanhias(condicoes, valores, companhias);

    if (filtro.problema && filtro.problema !== "TODOS") {
        condicoes.push("r.grupo_problema = ?");
        valores.push(filtro.problema);
    }

    if (periodo.dataInicial) {
        condicoes.push("r.data_abertura >= ?");
        valores.push(periodo.dataInicial);
    }

    if (periodo.dataFinal) {
        condicoes.push("r.data_abertura <= ?");
        valores.push(periodo.dataFinal);
    }

    return montarCondicoes(condicoes, valores);
}

async function listarOpcoesFiltro() {
    const estados = `
        SELECT DISTINCT uf, nome_estado
        FROM aeroporto
        WHERE uf IS NOT NULL
        ORDER BY nome_estado;
    `;

    const companhias = `
        SELECT c.id_companhia,
               COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS nome,
               c.nacionalidade
        FROM companhia c
        WHERE EXISTS (SELECT 1 FROM voo_mensal v WHERE v.id_companhia = c.id_companhia)
           OR EXISTS (SELECT 1 FROM reclamacao r WHERE r.id_companhia = c.id_companhia)
        ORDER BY nome;
    `;

    const problemas = `
        SELECT grupo_problema, COUNT(*) AS total
        FROM reclamacao
        WHERE grupo_problema IS NOT NULL
        GROUP BY grupo_problema
        ORDER BY total DESC;
    `;

    const periodo = `
        SELECT MIN(ano) AS ano_minimo, MAX(ano) AS ano_maximo FROM voo_mensal;
    `;

    const [estadosResult, companhiasResult, problemasResult, periodoResult] = await Promise.all([
        database.executar(estados),
        database.executar(companhias),
        database.executar(problemas),
        database.executar(periodo)
    ]);

    return {
        estados: estadosResult,
        companhias: companhiasResult,
        problemas: problemasResult.map(linha => linha.grupo_problema),
        periodo: periodoResult[0]
    };
}

async function obterPainelDestinos(filtro) {
    const condicao = condicoesVoos(filtro);

    const porEstado = `
        SELECT destino.uf AS uf,
               destino.nome_estado AS estado,
               SUM(v.passageiros_pagos) AS passageiros,
               SUM(v.assentos_ofertados) AS assentos
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE destino.uf IS NOT NULL ${condicao.sql}
        GROUP BY destino.uf, destino.nome_estado
        ORDER BY passageiros DESC;
    `;

    const porCompanhia = `
        SELECT COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               SUM(v.passageiros_pagos) AS passageiros
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE 1 = 1 ${condicao.sql}
        GROUP BY companhia
        ORDER BY passageiros DESC
        LIMIT 8;
    `;

    const principaisAeroportos = `
        SELECT destino.nome_aeroporto AS aeroporto,
               destino.uf AS uf,
               SUM(v.passageiros_pagos) AS passageiros
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE destino.uf IS NOT NULL ${condicao.sql}
        GROUP BY destino.nome_aeroporto, destino.uf
        ORDER BY passageiros DESC
        LIMIT 8;
    `;

    const totais = `
        SELECT SUM(v.passageiros_pagos) AS passageiros,
               SUM(v.assentos_ofertados) AS assentos
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE 1 = 1 ${condicao.sql};
    `;

    const [estadoResult, companhiaResult, aeroportoResult, totaisResult] = await Promise.all([
        database.executar(porEstado, condicao.valores),
        database.executar(porCompanhia, condicao.valores),
        database.executar(principaisAeroportos, condicao.valores),
        database.executar(totais, condicao.valores)
    ]);

    const resumo = totaisResult[0] || {};
    const passageiros = Number(resumo.passageiros || 0);
    const assentos = Number(resumo.assentos || 0);

    return {
            porEstado: estadoResult,
            porCompanhia: companhiaResult,
            principaisAeroportos: aeroportoResult,
            totais: {
                passageiros: passageiros,
                assentos: assentos,
                taxaOcupacao: assentos > 0 ? (passageiros / assentos) * 100 : null,
                faturamentoEstimado: passageiros * PRECO_MEDIO_PASSAGEM,
                precoMedioPassagem: PRECO_MEDIO_PASSAGEM
            }
    };
}

async function obterPainelCompanhias(filtro) {
    const condicaoReclamacao = condicoesReclamacoes(filtro);
    const condicaoVoo = condicoesVoos(filtro);

    const porProblema = `
        SELECT r.grupo_problema AS problema,
               COUNT(*) AS quantidade
        FROM reclamacao r
        JOIN companhia c ON c.id_companhia = r.id_companhia
        WHERE r.grupo_problema IS NOT NULL ${condicaoReclamacao.sql}
        GROUP BY r.grupo_problema
        ORDER BY quantidade DESC;
    `;

    const porCompanhia = `
        SELECT COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               COUNT(*) AS reclamacoes,
               SUM(r.avaliacao_reclamacao = 'Resolvida') AS resolvidas,
               SUM(r.avaliacao_reclamacao = 'Não Resolvida') AS nao_resolvidas,
               AVG(r.nota_consumidor) AS nota_media,
               AVG(r.tempo_resposta_dias) AS tempo_medio
        FROM reclamacao r
        JOIN companhia c ON c.id_companhia = r.id_companhia
        WHERE 1 = 1 ${condicaoReclamacao.sql}
        GROUP BY companhia
        ORDER BY reclamacoes DESC
        LIMIT 8;
    `;

    const totais = `
        SELECT COUNT(*) AS reclamacoes,
               SUM(r.avaliacao_reclamacao = 'Resolvida') AS resolvidas,
               SUM(r.avaliacao_reclamacao = 'Não Resolvida') AS nao_resolvidas,
               AVG(r.nota_consumidor) AS nota_media
        FROM reclamacao r
        JOIN companhia c ON c.id_companhia = r.id_companhia
        WHERE 1 = 1 ${condicaoReclamacao.sql};
    `;

    const volumePorCompanhia = `
        SELECT COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               SUM(v.passageiros_pagos) AS passageiros,
               SUM(v.assentos_ofertados) AS assentos
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE 1 = 1 ${condicaoVoo.sql}
        GROUP BY companhia
        ORDER BY passageiros DESC
        LIMIT 8;
    `;

    const [problemaResult, companhiaResult, totaisResult, volumeResult] = await Promise.all([
        database.executar(porProblema, condicaoReclamacao.valores),
        database.executar(porCompanhia, condicaoReclamacao.valores),
        database.executar(totais, condicaoReclamacao.valores),
        database.executar(volumePorCompanhia, condicaoVoo.valores)
    ]);

    const resumo = totaisResult[0] || {};
    const reclamacoes = Number(resumo.reclamacoes || 0);
    const resolvidas = Number(resumo.resolvidas || 0);
    const naoResolvidas = Number(resumo.nao_resolvidas || 0);
    const avaliadas = resolvidas + naoResolvidas;

    return {
            porProblema: problemaResult,
            porCompanhia: companhiaResult,
            volumePorCompanhia: volumeResult,
            totais: {
                reclamacoes: reclamacoes,
                resolvidas: resolvidas,
                avaliadas: avaliadas,
                taxaResolucao: avaliadas > 0 ? (resolvidas / avaliadas) * 100 : null,
                notaMedia: resumo.nota_media === null ? null : Number(resumo.nota_media)
            }
    };
}

module.exports = {
    listarOpcoesFiltro,
    obterPainelDestinos,
    obterPainelCompanhias
};
