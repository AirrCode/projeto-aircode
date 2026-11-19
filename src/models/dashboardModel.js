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
        dataInicial: "2025-11-01",
        dataFinal: "2025-11-30"
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

function obterFiltroPeriodoAnterior(filtro) {
    const periodo = montarPeriodo(filtro);
    if (periodo.inicio === null || periodo.fim === null) {
        return null;
    }

    const inicio = Math.floor(periodo.inicio / 100) * 12 + periodo.inicio % 100 - 1;
    const fim = Math.floor(periodo.fim / 100) * 12 + periodo.fim % 100 - 1;
    const quantidadeMeses = fim - inicio + 1;
    if (quantidadeMeses <= 0) {
        return null;
    }

    function formatarDataMes(indice) {
        const ano = Math.floor(indice / 12);
        const mes = indice % 12 + 1;
        return `${ano}-${String(mes).padStart(2, "0")}-01`;
    }

    const fimAnterior = inicio - 1;
    const inicioAnterior = fimAnterior - quantidadeMeses + 1;
    return {
        dataInicial: formatarDataMes(inicioAnterior),
        dataFinal: formatarDataMes(fimAnterior)
    };
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

async function listarCompanhiasSelecionadas(filtro) {
    const companhias = obterCompanhiasDoFiltro(filtro);
    if (companhias.length === 0) {
        return [];
    }

    const condicoes = [];
    const valores = [];
    adicionarCondicaoCompanhias(condicoes, valores, companhias);
    const condicao = montarCondicoes(condicoes, valores);

    return database.executar(`
        SELECT c.id_companhia AS idCompanhia,
               COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia
        FROM companhia c
        WHERE 1 = 1 ${condicao.sql}
        ORDER BY companhia;
    `, condicao.valores);
}

function completarCompanhiasSelecionadas(linhas, companhias, valoresPadrao) {
    if (companhias.length === 0) {
        return linhas;
    }

    const linhasPorId = new Map(linhas.map(function (linha) {
        return [String(linha.idCompanhia), linha];
    }));

    return companhias.map(function (companhia) {
        return Object.assign(
            {
                idCompanhia: companhia.idCompanhia,
                companhia: companhia.companhia
            },
            valoresPadrao,
            linhasPorId.get(String(companhia.idCompanhia)) || {}
        );
    });
}

function condicoesVoos(filtro, campoEstado) {
    const condicoes = [];
    const valores = [];
    const estados = obterEstadosDoFiltro(filtro);
    const estadoSql = campoEstado || "destino.uf";

    if (estados.length === 1) {
        condicoes.push(`${estadoSql} = ?`);
        valores.push(estados[0]);
    } else if (estados.length > 1) {
        condicoes.push(`${estadoSql} IN (${estados.map(function () { return "?"; }).join(", ")})`);
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

async function listarPassageirosInternacionaisPorEstado(filtro) {
    const campoEstado = "COALESCE(origem.uf, destino.uf)";
    const campoNomeEstado = "COALESCE(origem.nome_estado, destino.nome_estado)";
    const condicao = condicoesVoos(filtro, campoEstado);
    return database.executar(`
        SELECT ${campoEstado} AS uf,
               ${campoNomeEstado} AS estado,
               SUM(v.passageiros_pagos + v.passageiros_gratis) AS passageiros
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto origem ON origem.id_aeroporto = r.id_aeroporto_origem
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE r.natureza = 'INTERNACIONAL'
          AND ${campoEstado} IS NOT NULL ${condicao.sql}
        GROUP BY ${campoEstado}, ${campoNomeEstado}
        ORDER BY passageiros DESC;
    `, condicao.valores);
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

    const problemas = Array.isArray(filtro.problemas) && filtro.problemas.length
        ? filtro.problemas
        : (filtro.problema && filtro.problema !== "TODOS" ? [filtro.problema] : []);
    if (problemas.length === 1) {
        condicoes.push("r.grupo_problema = ?");
        valores.push(problemas[0]);
    } else if (problemas.length > 1) {
        condicoes.push(`r.grupo_problema IN (${problemas.map(function () { return "?"; }).join(", ")})`);
        valores.push(...problemas);
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
    const companhiasSelecionadas = obterCompanhiasDoFiltro(filtro);
    const periodoAnterior = obterFiltroPeriodoAnterior(filtro);
    const filtroAnterior = periodoAnterior
        ? Object.assign({}, filtro, periodoAnterior)
        : null;

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
        SELECT c.id_companhia AS idCompanhia,
               COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               SUM(v.passageiros_pagos) AS passageiros
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE 1 = 1 ${condicao.sql}
        GROUP BY c.id_companhia, COALESCE(c.nome_fantasia_consumidor, c.nome_empresa)
        ORDER BY SUM(v.passageiros_pagos) DESC
        ${companhiasSelecionadas.length ? "" : "LIMIT 6;"}
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

    const [
        estadoResult,
        companhiaResult,
        aeroportoResult,
        totaisResult,
        internacionaisResult,
        internacionaisAnteriorResult,
        companhiasSelecionadasResult
    ] = await Promise.all([
        database.executar(porEstado, condicao.valores),
        database.executar(porCompanhia, condicao.valores),
        database.executar(principaisAeroportos, condicao.valores),
        database.executar(totais, condicao.valores),
        listarPassageirosInternacionaisPorEstado(filtro),
        filtroAnterior
            ? listarPassageirosInternacionaisPorEstado(filtroAnterior)
            : Promise.resolve([]),
        listarCompanhiasSelecionadas(filtro)
    ]);

    const resumo = totaisResult[0] || {};
    const passageiros = Number(resumo.passageiros || 0);
    const assentos = Number(resumo.assentos || 0);
    const estadosInternacionais = new Map();

    internacionaisResult.forEach(function (item) {
        estadosInternacionais.set(item.uf, {
            uf: item.uf,
            estado: item.estado,
            passageiros: Number(item.passageiros || 0),
            passageirosAnterior: 0
        });
    });

    internacionaisAnteriorResult.forEach(function (item) {
        const estado = estadosInternacionais.get(item.uf) || {
            uf: item.uf,
            estado: item.estado,
            passageiros: 0,
            passageirosAnterior: 0
        };
        estado.passageirosAnterior = Number(item.passageiros || 0);
        estadosInternacionais.set(item.uf, estado);
    });

    const porEstadoInternacional = Array.from(estadosInternacionais.values())
        .map(function (estado) {
            return {
                uf: estado.uf,
                estado: estado.estado,
                passageiros: estado.passageiros,
                passageirosAnterior: estado.passageirosAnterior,
                crescimentoPercentual: filtroAnterior && estado.passageirosAnterior > 0
                    ? ((estado.passageiros - estado.passageirosAnterior) / estado.passageirosAnterior) * 100
                    : null,
                crescimentoNovo: Boolean(filtroAnterior)
                    && estado.passageirosAnterior === 0
                    && estado.passageiros > 0
            };
        })
        .sort(function (a, b) {
            if (a.crescimentoNovo !== b.crescimentoNovo) {
                return a.crescimentoNovo ? -1 : 1;
            }
            if (a.crescimentoPercentual !== null && b.crescimentoPercentual !== null
                && a.crescimentoPercentual !== b.crescimentoPercentual) {
                return b.crescimentoPercentual - a.crescimentoPercentual;
            }
            return b.passageiros - a.passageiros;
        });

    return {
            porEstado: estadoResult,
            porEstadoInternacional: porEstadoInternacional,
            porCompanhia: completarCompanhiasSelecionadas(
                companhiaResult,
                companhiasSelecionadasResult,
                { passageiros: 0 }
            ),
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
    const companhiasSelecionadas = obterCompanhiasDoFiltro(filtro);

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
        SELECT c.id_companhia AS idCompanhia,
               COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               COUNT(*) AS reclamacoes,
               SUM(r.avaliacao_reclamacao = 'Resolvida') AS resolvidas,
               SUM(r.avaliacao_reclamacao = 'Não Resolvida') AS nao_resolvidas,
               AVG(r.nota_consumidor) AS nota_media,
               AVG(r.tempo_resposta_dias) AS tempo_medio
        FROM reclamacao r
        JOIN companhia c ON c.id_companhia = r.id_companhia
        WHERE 1 = 1 ${condicaoReclamacao.sql}
        GROUP BY c.id_companhia, COALESCE(c.nome_fantasia_consumidor, c.nome_empresa)
        ORDER BY reclamacoes DESC
        ${companhiasSelecionadas.length ? "" : "LIMIT 8;"}
    `;

    const problemasPorCompanhia = `
        SELECT c.id_companhia AS idCompanhia,
               COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               r.grupo_problema AS problema,
               COUNT(*) AS quantidade
        FROM reclamacao r
        JOIN companhia c ON c.id_companhia = r.id_companhia
        WHERE r.grupo_problema IS NOT NULL ${condicaoReclamacao.sql}
        GROUP BY c.id_companhia,
                 COALESCE(c.nome_fantasia_consumidor, c.nome_empresa),
                 r.grupo_problema
        ORDER BY quantidade DESC;
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
        SELECT c.id_companhia AS idCompanhia,
               COALESCE(c.nome_fantasia_consumidor, c.nome_empresa) AS companhia,
               SUM(v.passageiros_pagos) AS passageiros,
               SUM(v.assentos_ofertados) AS assentos
        FROM voo_mensal v
        JOIN rota r ON r.id_rota = v.id_rota
        JOIN aeroporto destino ON destino.id_aeroporto = r.id_aeroporto_destino
        JOIN companhia c ON c.id_companhia = v.id_companhia
        WHERE 1 = 1 ${condicaoVoo.sql}
        GROUP BY c.id_companhia, COALESCE(c.nome_fantasia_consumidor, c.nome_empresa)
        ORDER BY passageiros DESC
        ${companhiasSelecionadas.length ? "" : "LIMIT 8;"}
    `;

    const [
        problemaResult,
        companhiaResult,
        totaisResult,
        volumeResult,
        problemasPorCompanhiaResult,
        companhiasSelecionadasResult
    ] = await Promise.all([
        database.executar(porProblema, condicaoReclamacao.valores),
        database.executar(porCompanhia, condicaoReclamacao.valores),
        database.executar(totais, condicaoReclamacao.valores),
        database.executar(volumePorCompanhia, condicaoVoo.valores),
        database.executar(problemasPorCompanhia, condicaoReclamacao.valores),
        listarCompanhiasSelecionadas(filtro)
    ]);

    const resumo = totaisResult[0] || {};
    const reclamacoes = Number(resumo.reclamacoes || 0);
    const resolvidas = Number(resumo.resolvidas || 0);
    const naoResolvidas = Number(resumo.nao_resolvidas || 0);
    const avaliadas = resolvidas + naoResolvidas;

    return {
            porProblema: problemaResult,
            problemasPorCompanhia: problemasPorCompanhiaResult,
            porCompanhia: completarCompanhiasSelecionadas(
                companhiaResult,
                companhiasSelecionadasResult,
                {
                    reclamacoes: 0,
                    resolvidas: 0,
                    nao_resolvidas: 0,
                    nota_media: null,
                    tempo_medio: null
                }
            ),
            volumePorCompanhia: completarCompanhiasSelecionadas(
                volumeResult,
                companhiasSelecionadasResult,
                { passageiros: 0, assentos: 0 }
            ),
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
