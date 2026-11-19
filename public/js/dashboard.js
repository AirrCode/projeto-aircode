const graficos = {};
const cores = {
    azul: '#1B39D6',
    marinho: '#0C1B4D',
    amarelo: '#F5C518',
    cinza: '#76809c'
};

const paleta = [
    '#0C1B4D', '#1B39D6', '#F5C518', '#7d86a3',
    '#2f9e8f', '#c2561f', '#5b3fa8', '#b9bfd0'
];

// Preenchido pela rota /dashboard/filtros assim que a pagina carrega.
let opcoesFiltro = { estados: [], companhias: [], problemas: [], periodo: {} };
const cacheDados = {};
let alertasDisparados = [];
let verificandoAlertas = false;
let alertaAtual = null;
let temporizadorAlerta = null;

function formatarQuantidade(numero) {
    const valor = Number(numero || 0);
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function definirTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = texto;
    }
}

function obterFiltroAtual(tipoPainel) {
    const chave = `filtro_atual_${tipoPainel}`;
    const filtro = JSON.parse(localStorage.getItem(chave) || 'null');

    if (!filtro) {
        return null;
    }

    const filtroNormalizado = normalizarFiltro(filtro, tipoPainel);
    if (
        filtro.dataInicial !== filtroNormalizado.dataInicial
        || filtro.dataFinal !== filtroNormalizado.dataFinal
    ) {
        localStorage.setItem(chave, JSON.stringify(filtroNormalizado));
    }

    return filtroNormalizado;
}

function obterChaveFiltros(tipoPainel) {
    return tipoPainel === 'companhias' ? 'filtros_companhias' : 'filtros_destinos';
}

function obterPainelAtual() {
    const opcaoAtiva = document.querySelector('.opcao_dashboard.ativa');
    return opcaoAtiva ? opcaoAtiva.dataset.painel : 'destinos';
}

function obterNomeEstado(codigoEstado) {
    if (!codigoEstado || codigoEstado === 'TODOS') {
        return 'Todos os estados';
    }

    const estado = opcoesFiltro.estados.find(function (item) {
        return item.uf === codigoEstado;
    });

    return estado ? estado.nome_estado : codigoEstado;
}

function obterEstadosSelecionados(filtro) {
    if (Array.isArray(filtro.estados) && filtro.estados.length) {
        return filtro.estados;
    }

    return filtro.estado && filtro.estado !== 'TODOS' ? [filtro.estado] : [];
}

function obterCompanhiasSelecionadas(filtro) {
    if (Array.isArray(filtro.companhias) && filtro.companhias.length) {
        return filtro.companhias;
    }

    return filtro.companhia && filtro.companhia !== 'TODAS' ? [filtro.companhia] : [];
}

function obterNomeCompanhia(idCompanhia) {
    if (!idCompanhia || idCompanhia === 'TODAS') {
        return 'Todas as companhias';
    }

    const companhia = opcoesFiltro.companhias.find(function (item) {
        return String(item.id_companhia) === String(idCompanhia);
    });

    return companhia ? companhia.nome : idCompanhia;
}

function obterDatasDoPeriodo(filtro) {
    const dataInicial = filtro && filtro.dataInicial ? filtro.dataInicial : '';
    const dataFinal = filtro && filtro.dataFinal ? filtro.dataFinal : '';

    if (dataInicial || dataFinal) {
        return { dataInicial: dataInicial, dataFinal: dataFinal };
    }

    return {
        dataInicial: '2025-11-01',
        dataFinal: '2025-11-30'
    };
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarMesAno(dataISO) {
    if (!dataISO) {
        return '';
    }

    const partes = dataISO.split('-').map(Number);
    const data = new Date(partes[0], partes[1] - 1, partes[2] || 1);
    const mes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const mesCapitalizado = mes.charAt(0).toLocaleUpperCase('pt-BR') + mes.slice(1);
    return `${mesCapitalizado} - ${data.getFullYear()}`;
}

function obterRotuloCurtoDoPeriodo(filtro) {
    const periodo = obterDatasDoPeriodo(filtro);
    const inicio = formatarMesAno(periodo.dataInicial);
    const fim = formatarMesAno(periodo.dataFinal);

    if (inicio && fim && inicio === fim) {
        return inicio;
    }
    if (inicio && fim) {
        return `${inicio} a ${fim}`;
    }
    return inicio ? `A partir de ${inicio}` : `Até ${fim}`;
}

function obterRotuloComparativo(filtro) {
    const periodo = obterDatasDoPeriodo(filtro);
    const inicio = new Date(`${periodo.dataInicial}T00:00:00`);
    const fim = new Date(`${periodo.dataFinal}T00:00:00`);
    if (inicio.getFullYear() === fim.getFullYear()
        && inicio.getMonth() === fim.getMonth()
    ) {
        const mesAnterior = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
        return `${formatarMesAno(formatarDataISO(mesAnterior))} | ${formatarMesAno(periodo.dataInicial)}`;
    }

    return obterRotuloCurtoDoPeriodo(filtro);
}

function atualizarRotulosDePeriodo(tipoPainel, filtro) {
    const rotulo = obterRotuloCurtoDoPeriodo(filtro);
    document.querySelectorAll(`[data-periodo-kpi="${tipoPainel}"]`).forEach(function (elemento) {
        elemento.textContent = rotulo;
    });

    if (tipoPainel === 'destinos') {
        const comparativo = document.querySelector('[data-periodo-comparativo="destinos"]');
        if (comparativo) {
            comparativo.textContent = obterRotuloComparativo(filtro);
        }
    }
}

function obterTextoDoPeriodo(filtro) {
    const periodo = obterDatasDoPeriodo(filtro);
    const inicio = periodo.dataInicial
        ? new Date(`${periodo.dataInicial}T00:00:00`).toLocaleDateString('pt-BR')
        : 'início';
    const fim = periodo.dataFinal
        ? new Date(`${periodo.dataFinal}T00:00:00`).toLocaleDateString('pt-BR')
        : 'hoje';
    return `${inicio} a ${fim}`;
}

// ---------------------------------------------------------------------------
// Acesso aos dados do banco
// ---------------------------------------------------------------------------

function montarParametros(filtro) {
    const parametros = new URLSearchParams();
    filtro = filtro || {};

    const estados = obterEstadosSelecionados(filtro);
    estados.forEach(function (estado) {
        parametros.append('estados', estado);
    });

    obterCompanhiasSelecionadas(filtro).forEach(function (companhia) {
        parametros.append('companhias', companhia);
    });
    const problemas = Array.isArray(filtro.problemas) && filtro.problemas.length
        ? filtro.problemas
        : (filtro.problema && filtro.problema !== 'TODOS' ? [filtro.problema] : []);
    problemas.forEach(function (problema) {
        parametros.append('problema', problema);
    });
    const periodo = obterDatasDoPeriodo(filtro);
    parametros.set('dataInicial', periodo.dataInicial);
    parametros.set('dataFinal', periodo.dataFinal);

    return parametros;
}

async function buscarJson(caminho) {
    const resposta = await fetch(caminho);

    if (!resposta.ok) {
        const corpo = await resposta.json().catch(function () {
            return { mensagem: 'Falha ao consultar o servidor.' };
        });
        throw new Error(corpo.mensagem || 'Falha ao consultar o servidor.');
    }

    return resposta.json();
}

async function carregarOpcoesFiltro() {
    opcoesFiltro = await buscarJson('/dashboard/filtros');
}

async function carregarPainel(tipoPainel) {
    const filtro = obterFiltroAtual(tipoPainel);
    const parametros = montarParametros(filtro).toString();
    const caminho = `/dashboard/${tipoPainel}${parametros ? '?' + parametros : ''}`;

    if (cacheDados[caminho]) {
        return cacheDados[caminho];
    }

    const dados = await buscarJson(caminho);
    cacheDados[caminho] = dados;
    return dados;
}

function limparCache() {
    Object.keys(cacheDados).forEach(function (chave) {
        delete cacheDados[chave];
    });
}

function mostrarErro(mensagem) {
    const aviso = document.getElementById('aviso_erro_dashboard');

    if (aviso) {
        aviso.textContent = mensagem;
        aviso.hidden = false;
        return;
    }

    const novo = document.createElement('p');
    novo.id = 'aviso_erro_dashboard';
    novo.className = 'aviso_erro_dashboard';
    novo.textContent = mensagem;
    document.querySelector('.principal_dashboard').prepend(novo);
}

function esconderErro() {
    const aviso = document.getElementById('aviso_erro_dashboard');
    if (aviso) {
        aviso.hidden = true;
    }
}

function mostrarProximoAlerta() {
    const popup = document.getElementById('popup_alerta');
    const barra = document.getElementById('barra_popup_alerta');
    const alerta = alertasDisparados.shift();
    window.clearTimeout(temporizadorAlerta);
    alertaAtual = alerta || null;

    if (!alerta) {
        popup.hidden = true;
        delete popup.dataset.alertaId;
        return;
    }

    document.getElementById('popup_titulo').textContent = alerta.nome;
    document.getElementById('popup_mensagem').textContent = alerta.mensagem;
    document.getElementById('popup_ancora').textContent = alerta.ancora || '';
    document.getElementById('popup_filtro').textContent =
        alerta.filtro && alerta.filtro.nome ? alerta.filtro.nome : '';
    document.getElementById('linha_filtro_popup').hidden = !alerta.filtro;
    popup.dataset.alertaId = String(alerta.id);
    popup.hidden = false;
    barra.classList.remove('ativo');
    void barra.offsetWidth;
    barra.classList.add('ativo');
    temporizadorAlerta = window.setTimeout(mostrarProximoAlerta, 10000);
}

async function abrirAlertaNaDashboard() {
    if (!alertaAtual) {
        return;
    }

    const alerta = alertaAtual;
    const indicadoresCompanhias = ['avaliacao', 'resolucao', 'reclamacao', 'frequente'];
    const tipoPainel = alerta.filtro && alerta.filtro.tipo
        ? alerta.filtro.tipo
        : (indicadoresCompanhias.includes(alerta.indicador) ? 'companhias' : 'destinos');

    mostrarProximoAlerta();

    if (alerta.filtro) {
        localStorage.setItem(
            `filtro_atual_${tipoPainel}`,
            JSON.stringify(normalizarFiltro(alerta.filtro, tipoPainel))
        );
    } else {
        localStorage.removeItem(`filtro_atual_${tipoPainel}`);
    }

    limparCache();
    await selecionarPainel(tipoPainel);

    const idsKpi = {
        destinos: 'kpi_destinos_valor',
        destaque: 'kpi_estado_destaque',
        faturamento: 'kpi_faturamento',
        internacionais: 'kpi_internacionais_valor',
        avaliacao: 'kpi_avaliacao',
        resolucao: 'kpi_resolucao',
        reclamacao: 'kpi_reclamacoes',
        frequente: 'kpi_problema'
    };
    const elementoKpi = document.getElementById(idsKpi[alerta.indicador]);
    const cartaoKpi = elementoKpi && elementoKpi.closest('.cartao_indicador');

    if (cartaoKpi) {
        cartaoKpi.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cartaoKpi.classList.remove('alerta_destacado');
        void cartaoKpi.offsetWidth;
        cartaoKpi.classList.add('alerta_destacado');
        window.setTimeout(function () {
            cartaoKpi.classList.remove('alerta_destacado');
        }, 2400);
    }
}

async function verificarAlertasAtivos() {
    const idUsuario = sessionStorage.ID_USUARIO;
    if (!idUsuario || verificandoAlertas) return;

    verificandoAlertas = true;
    try {
        const resposta = await fetch(`/alertas/avaliar?idUsuario=${encodeURIComponent(idUsuario)}`);
        const corpo = await resposta.json().catch(function () {
            return {};
        });
        if (!resposta.ok) {
            throw new Error(corpo.mensagem || 'Não foi possível verificar seus alertas.');
        }
        const popup = document.getElementById('popup_alerta');
        const alertaVisivel = popup && popup.dataset.alertaId;
        const idsPendentes = alertasDisparados.map(function (alerta) { return String(alerta.id); });
        alertasDisparados = alertasDisparados.concat(corpo.filter(function (alerta) {
            return String(alerta.id) !== String(alertaVisivel)
                && !idsPendentes.includes(String(alerta.id));
        }));
        if (alertasDisparados.length && (!popup || popup.hidden)) {
            mostrarProximoAlerta();
        }
    } catch (erro) {
        console.log('Erro ao verificar alertas ativos.', erro);
        mostrarErro(`Não foi possível verificar os alertas: ${erro.message}`);
    } finally {
        verificandoAlertas = false;
    }
}

// ---------------------------------------------------------------------------
// Graficos
// ---------------------------------------------------------------------------

function criarGrafico(id, tipo, dados, opcoes = {}) {
    const elemento = document.getElementById(id);
    if (!elemento || typeof Chart === 'undefined') {
        return;
    }

    if (graficos[id]) {
        graficos[id].destroy();
    }

    graficos[id] = new Chart(elemento, {
        type: tipo,
        data: dados,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: cores.marinho,
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 16
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#e3e7ef' },
                    ticks: { color: cores.cinza }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: cores.cinza }
                }
            },
            ...opcoes
        }
    });
}

function renderizarPainelDestinos(dados, filtro) {
    atualizarRotulosDePeriodo('destinos', filtro);
    const estados = dados.porEstado || [];
    const periodo = obterTextoDoPeriodo(filtro);

    const topCinco = estados.slice(0, 5);
    const periodoKpi = obterRotuloCurtoDoPeriodo(filtro).replace(/ - /g, '/');
    definirTexto('kpi_destinos_titulo', `TOP 5 Destinos ${periodoKpi}`);
    const rankingDestinos = document.getElementById('kpi_destinos_valor');
    rankingDestinos.replaceChildren();
    if (topCinco.length) {
        topCinco.forEach(function (estado, indice) {
            const linha = document.createElement('span');
            linha.textContent =
                `${indice + 1}º ${estado.estado || estado.uf} (${estado.uf}) - ${formatarQuantidade(estado.passageiros)} passageiros`;
            rankingDestinos.appendChild(linha);
        });
    } else {
        rankingDestinos.textContent = 'Sem dados para este filtro';
    }

    const destaque = estados[0];
    definirTexto('kpi_estado_destaque', destaque ? destaque.estado || destaque.uf : 'Sem dados');
    definirTexto('kpi_estado_destaque_detalhe', destaque
        ? `${formatarQuantidade(destaque.passageiros)} passageiros no período`
        : 'Nenhum voo para este filtro');

    const internacionais = (dados.porEstadoInternacional || []).slice(0, 5);
    const rankingInternacionais = document.getElementById('kpi_internacionais_valor');
    rankingInternacionais.replaceChildren();
    if (internacionais.length) {
        internacionais.forEach(function (estado, indice) {
            const linha = document.createElement('span');
            linha.className = 'linha_ranking_internacional';
            const texto = document.createElement('span');
            const crescimento = estado.crescimentoNovo
                ? 'novo'
                : estado.crescimentoPercentual === null
                    ? 'sem comparação'
                    : `${estado.crescimentoPercentual > 0 ? '+' : ''}${estado.crescimentoPercentual.toFixed(1).replace('.', ',')}%`;
            texto.textContent =
                `${indice + 1}º ${estado.estado || estado.uf} (${estado.uf}) — ${formatarQuantidade(estado.passageiros)} viajantes (${crescimento})`;
            linha.appendChild(texto);

            if (estado.crescimentoNovo || Number(estado.crescimentoPercentual) > 0) {
                const seta = document.createElement('span');
                seta.className = 'seta_crescimento';
                seta.textContent = '↑';
                seta.setAttribute('aria-hidden', 'true');
                linha.appendChild(seta);
            }

            rankingInternacionais.appendChild(linha);
        });
    } else {
        rankingInternacionais.textContent = 'Sem dados internacionais para este filtro';
    }
    definirTexto('kpi_internacionais_detalhe', 'Crescimento em relação ao mês anterior');

    const contexto = [];
    const estadosSelecionados = filtro ? obterEstadosSelecionados(filtro) : [];
    if (estadosSelecionados.length) {
        contexto.push(estadosSelecionados.map(obterNomeEstado).join(', '));
    }
    if (filtro) {
        contexto.push(periodo);
    }
    const sufixo = contexto.length ? ` · ${contexto.join(' · ')}` : '';

    definirTexto('titulo_grafico_origem_destino', `Passageiros por estado de destino${sufixo}`);
    definirTexto('titulo_grafico_mapa', `Volume de passageiros por estado${sufixo}`);
    definirTexto('titulo_grafico_origem_bahia', `Passageiros por companhia aérea${sufixo}`);

    if (typeof Chart === 'undefined') {
        return;
    }

    const topEstados = estadosSelecionados.length
        ? estados
        : estados.slice(0, 8);
    criarGrafico('grafico_origem_destino', 'bar', {
        labels: topEstados.map(function (estado) { return estado.uf; }),
        datasets: [{
            label: 'Passageiros',
            data: topEstados.map(function (estado) { return Number(estado.passageiros); }),
            backgroundColor: cores.marinho,
            borderRadius: 5,
            maxBarThickness: 44
        }]
    }, {
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (contextoTooltip) {
                        return `${formatarQuantidade(contextoTooltip.raw)} passageiros`;
                    }
                }
            }
        }
    });

    const companhias = (dados.porCompanhia || [])
        .slice()
        .sort(function (a, b) {
            return Number(b.passageiros || 0) - Number(a.passageiros || 0);
        })
        .slice(0, 6);
    criarGrafico('grafico_origem_bahia', 'bar', {
        labels: companhias.map(function (item) { return item.companhia; }),
        datasets: [{
            label: 'Passageiros',
            data: companhias.map(function (item) { return Number(item.passageiros); }),
            backgroundColor: cores.marinho,
            borderRadius: 5,
            maxBarThickness: 28
        }]
    }, {
        indexAxis: 'y',
        scales: {
            x: {
                beginAtZero: true,
                grid: { color: '#e3e7ef' },
                ticks: {
                    color: cores.cinza,
                    callback: function (valor) {
                        return formatarQuantidade(valor);
                    }
                }
            },
            y: {
                grid: { display: false },
                ticks: { color: cores.cinza, autoSkip: false }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (contextoTooltip) {
                        return `${formatarQuantidade(contextoTooltip.raw)} passageiros`;
                    }
                }
            }
        }
    });

    desenharMapa(estados, filtro);
}

function obterDadosCompanhiasSelecionadas(linhas, selecionadas, valoresPadrao) {
    return selecionadas.map(function (idCompanhia) {
        const nome = obterNomeCompanhia(idCompanhia);
        let linha = linhas.find(function (item) {
            return String(item.idCompanhia) === String(idCompanhia);
        });

        if (!linha) {
            linha = linhas.find(function (item) {
                return item.companhia === nome;
            });
        }

        return Object.assign(
            { idCompanhia: idCompanhia, companhia: nome },
            valoresPadrao,
            linha || {}
        );
    });
}

function renderizarKpiPorCompanhia(idValor, idDetalhe, idLista, companhias, obterValor, obterDetalhe) {
    const valor = document.getElementById(idValor);
    const detalhe = document.getElementById(idDetalhe);
    const lista = document.getElementById(idLista);
    const individualizado = companhias.length > 0;

    valor.hidden = individualizado;
    detalhe.hidden = individualizado;
    lista.hidden = !individualizado;
    lista.replaceChildren();

    if (!individualizado) {
        return;
    }

    companhias.forEach(function (companhia) {
        const item = document.createElement('div');
        item.className = 'item_kpi_companhia';

        const nome = document.createElement('span');
        nome.className = 'badge_kpi_companhia';
        nome.textContent = companhia.companhia;

        const resultado = document.createElement('strong');
        resultado.textContent = obterValor(companhia);

        const descricao = document.createElement('small');
        descricao.textContent = obterDetalhe(companhia);

        item.append(nome, resultado, descricao);
        lista.appendChild(item);
    });
}

function renderizarPainelCompanhias(dados, filtro) {
    atualizarRotulosDePeriodo('companhias', filtro);
    const totais = dados.totais || {};
    const problemas = dados.porProblema || [];
    const companhias = dados.porCompanhia || [];
    const volume = dados.volumePorCompanhia || [];
    const problemasPorCompanhia = dados.problemasPorCompanhia || [];
    const periodo = obterTextoDoPeriodo(filtro);
    const companhiasSelecionadas = filtro ? obterCompanhiasSelecionadas(filtro) : [];
    const companhiasParaKpi = obterDadosCompanhiasSelecionadas(companhias, companhiasSelecionadas, {
        reclamacoes: 0,
        resolvidas: 0,
        nao_resolvidas: 0,
        nota_media: null
    });
    const companhiasParaVolume = obterDadosCompanhiasSelecionadas(volume, companhiasSelecionadas, {
        passageiros: 0,
        assentos: 0
    });

    companhiasParaKpi.forEach(function (companhia) {
        const problemasDaCompanhia = problemasPorCompanhia.filter(function (item) {
            if (item.idCompanhia !== undefined && companhia.idCompanhia !== undefined) {
                return String(item.idCompanhia) === String(companhia.idCompanhia);
            }
            return item.companhia === companhia.companhia;
        });
        companhia.problemaMaisFrequente = problemasDaCompanhia.reduce(function (maisFrequente, item) {
            return !maisFrequente || Number(item.quantidade) > Number(maisFrequente.quantidade)
                ? item
                : maisFrequente;
        }, null);
    });

    const resumoCompanhias = companhiasSelecionadas.length === 1
        ? obterNomeCompanhia(companhiasSelecionadas[0])
        : companhiasSelecionadas.length
            ? `${companhiasSelecionadas.length} companhias selecionadas`
            : 'Todas as companhias';

    definirTexto('titulo_kpi_avaliacao', `Avaliação média - ${resumoCompanhias}`);
    definirTexto('kpi_avaliacao', companhiasSelecionadas.length
        ? 'Comparação por companhia'
        : totais.notaMedia !== null && totais.notaMedia !== undefined
            ? `${Number(totais.notaMedia).toFixed(1).replace('.', ',')}/5`
            : '—');
    definirTexto('kpi_avaliacao_detalhe', companhiasSelecionadas.length
        ? 'Métricas individuais exibidas abaixo'
        : totais.notaMedia !== null && totais.notaMedia !== undefined
            ? `nota média do consumidor · ${periodo}`
            : `sem notas atribuídas · ${periodo}`);
    renderizarKpiPorCompanhia(
        'kpi_avaliacao',
        'kpi_avaliacao_detalhe',
        'kpi_avaliacao_lista',
        companhiasParaKpi,
        function (companhia) {
            return companhia.nota_media === null || companhia.nota_media === undefined
                ? 'Sem dados'
                : `${Number(companhia.nota_media).toFixed(1).replace('.', ',')}/5`;
        },
        function (companhia) {
            return companhia.nota_media === null || companhia.nota_media === undefined
                ? 'Sem avaliações'
                : `Média · ${periodo}`;
        }
    );

    definirTexto('titulo_kpi_resolucao', `Taxa de resolução - ${resumoCompanhias}`);
    definirTexto('kpi_resolucao', companhiasSelecionadas.length
        ? 'Comparação por companhia'
        : totais.taxaResolucao === null || totais.taxaResolucao === undefined
            ? '—'
            : `${Math.round(totais.taxaResolucao)}%`);
    definirTexto('kpi_resolucao_detalhe', companhiasSelecionadas.length
        ? 'Métricas individuais exibidas abaixo'
        : totais.avaliadas
            ? `${formatarQuantidade(totais.resolvidas)} de ${formatarQuantidade(totais.avaliadas)} reclamações avaliadas`
            : 'Nenhuma reclamação avaliada neste período');
    renderizarKpiPorCompanhia(
        'kpi_resolucao',
        'kpi_resolucao_detalhe',
        'kpi_resolucao_lista',
        companhiasParaKpi,
        function (companhia) {
            const avaliadas = Number(companhia.resolvidas || 0) + Number(companhia.nao_resolvidas || 0);
            return avaliadas > 0
                ? `${Math.round((Number(companhia.resolvidas || 0) / avaliadas) * 100)}%`
                : 'Sem dados';
        },
        function (companhia) {
            const resolvidas = Number(companhia.resolvidas || 0);
            const avaliadas = resolvidas + Number(companhia.nao_resolvidas || 0);
            return avaliadas > 0
                ? `${formatarQuantidade(resolvidas)} de ${formatarQuantidade(avaliadas)} avaliadas`
                : 'Sem reclamações avaliadas';
        }
    );

    definirTexto('titulo_kpi_reclamacoes', `Total de reclamações - ${resumoCompanhias}`);
    definirTexto('kpi_reclamacoes', companhiasSelecionadas.length
        ? 'Comparação por companhia'
        : formatarQuantidade(totais.reclamacoes));
    definirTexto('kpi_reclamacoes_detalhe', `registradas · ${periodo}`);
    renderizarKpiPorCompanhia(
        'kpi_reclamacoes',
        'kpi_reclamacoes_detalhe',
        'kpi_reclamacoes_lista',
        companhiasParaKpi,
        function (companhia) {
            return formatarQuantidade(companhia.reclamacoes);
        },
        function () {
            return `registradas · ${periodo}`;
        }
    );

    const problemaTopo = problemas[0];
    definirTexto('titulo_kpi_problema', `Problema mais frequente - ${resumoCompanhias}`);
    definirTexto('kpi_problema', companhiasSelecionadas.length
        ? 'Comparação por companhia'
        : problemaTopo ? problemaTopo.problema : 'Sem dados');
    definirTexto('kpi_problema_detalhe', problemaTopo
        ? `${formatarQuantidade(problemaTopo.quantidade)} reclamações`
        : 'Nenhuma reclamação para este filtro');
    renderizarKpiPorCompanhia(
        'kpi_problema',
        'kpi_problema_detalhe',
        'kpi_problema_lista',
        companhiasParaKpi,
        function (companhia) {
            return companhia.problemaMaisFrequente
                ? companhia.problemaMaisFrequente.problema
                : 'Sem dados';
        },
        function (companhia) {
            return companhia.problemaMaisFrequente
                ? `${formatarQuantidade(companhia.problemaMaisFrequente.quantidade)} reclamações`
                : 'Nenhuma reclamação';
        }
    );

    const contexto = [];
    const estadosSelecionados = filtro ? obterEstadosSelecionados(filtro) : [];
    if (estadosSelecionados.length) {
        contexto.push(estadosSelecionados.map(obterNomeEstado).join(', '));
    }
    if (companhiasSelecionadas.length) {
        contexto.push(companhiasSelecionadas.map(obterNomeCompanhia).join(', '));
    }
    if (filtro && Array.isArray(filtro.problemas) && filtro.problemas.length) {
        contexto.push(filtro.problemas.join(', '));
    }
    if (filtro) {
        contexto.push(periodo);
    }
    const sufixo = contexto.length ? ` · ${contexto.join(' · ')}` : '';

    definirTexto('titulo_grafico_problemas', `Reclamações por grupo de problema${sufixo}`);
    definirTexto('titulo_grafico_assentos', `Passageiros por companhia${sufixo}`);
    definirTexto('titulo_grafico_resolucao', `Resolução das reclamações por companhia${sufixo}`);

    if (typeof Chart === 'undefined') {
        return;
    }

    const totalProblemas = problemas.reduce(function (total, item) {
        return total + Number(item.quantidade || 0);
    }, 0);
    const problemasParaGrafico = [];
    let quantidadeOutros = 0;

    problemas.forEach(function (item) {
        const quantidade = Number(item.quantidade || 0);
        if (item.problema === 'Outros' || (totalProblemas > 0 && quantidade < totalProblemas * 0.05)) {
            quantidadeOutros += quantidade;
        } else {
            problemasParaGrafico.push({
                problema: item.problema,
                quantidade: quantidade
            });
        }
    });

    if (quantidadeOutros > 0) {
        problemasParaGrafico.push({
            problema: 'Outros',
            quantidade: quantidadeOutros
        });
    }

    criarGrafico('grafico_problemas', 'pie', {
        labels: problemasParaGrafico.map(function (item) { return item.problema; }),
        datasets: [{
            label: 'Reclamações',
            data: problemasParaGrafico.map(function (item) { return item.quantidade; }),
            backgroundColor: problemasParaGrafico.map(function (item, indice) {
                return item.problema === 'Outros' ? '#b9bfd0' : paleta[indice % paleta.length];
            }),
            borderColor: '#f5f6fa',
            borderWidth: 3
        }]
    }, {
        scales: { x: { display: false }, y: { display: false } },
        plugins: { legend: { position: 'bottom' } }
    });

    const volumeParaGrafico = companhiasSelecionadas.length ? companhiasParaVolume : volume;
    criarGrafico('grafico_assentos', 'bar', {
        labels: volumeParaGrafico.map(function (item) { return item.companhia; }),
        datasets: [{
            label: 'Passageiros',
            data: volumeParaGrafico.map(function (item) { return Number(item.passageiros || 0); }),
            backgroundColor: cores.marinho,
            borderRadius: 5,
            maxBarThickness: 42
        }]
    }, {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, grid: { color: '#e3e7ef' } },
            y: { grid: { display: false } }
        }
    });

    const companhiasParaGraficoResolucao = companhiasSelecionadas.length ? companhiasParaKpi : companhias;

    criarGrafico('grafico_resolucao', 'bar', {
        labels: companhiasParaGraficoResolucao.map(function (item) { return item.companhia; }),
        datasets: [
            {
                label: 'Resolvido (%)',
                data: companhiasParaGraficoResolucao.map(function (item) {
                    const resolvidas = Number(item.resolvidas || 0);
                    const avaliadas = resolvidas + Number(item.nao_resolvidas || 0);
                    return avaliadas > 0 ? (resolvidas / avaliadas) * 100 : 0;
                }),
                backgroundColor: cores.azul,
                borderRadius: 4
            },
            {
                label: 'Não resolvido (%)',
                data: companhiasParaGraficoResolucao.map(function (item) {
                    const naoResolvidas = Number(item.nao_resolvidas || 0);
                    const avaliadas = Number(item.resolvidas || 0) + naoResolvidas;
                    return avaliadas > 0 ? (naoResolvidas / avaliadas) * 100 : 0;
                }),
                backgroundColor: '#b9bfd0',
                borderRadius: 4
            }
        ]
    }, {
        indexAxis: 'y',
        scales: {
            x: { stacked: true, max: 100, grid: { color: '#e3e7ef' } },
            y: { stacked: true, grid: { display: false } }
        }
    });
}

function atualizarResumoMapa(estados, filtro) {
    const resumo = document.getElementById('resumo_mapa');

    if (!resumo) {
        return;
    }

    if (!estados.length) {
        resumo.textContent = 'Sem voos para mostrar neste período.';
        return;
    }

    const estadosSelecionados = filtro ? obterEstadosSelecionados(filtro) : [];

    if (estadosSelecionados.length > 1) {
        const totalSelecionado = estados.reduce(function (soma, estado) {
            return soma + Number(estado.passageiros);
        }, 0);
        resumo.textContent =
            `${estadosSelecionados.map(obterNomeEstado).join(', ')}: ${formatarQuantidade(totalSelecionado)} passageiros no resultado filtrado.`;
        return;
    }

    const selecionado = estadosSelecionados.length === 1
        ? estados.find(function (estado) { return estado.uf === estadosSelecionados[0]; })
        : estados[0];

    if (!selecionado) {
        resumo.textContent = 'Sem voos para mostrar neste período.';
        return;
    }

    const total = estados.reduce(function (soma, estado) {
        return soma + Number(estado.passageiros);
    }, 0);
    const porcentagem = total
        ? ((Number(selecionado.passageiros) / total) * 100).toFixed(1).replace('.', ',')
        : '0,0';

    resumo.textContent =
        `${selecionado.estado || selecionado.uf}: ${formatarQuantidade(selecionado.passageiros)} passageiros (${porcentagem}% do resultado filtrado).`;
}

function desenharMapa(estados, filtro) {
    atualizarResumoMapa(estados, filtro);

    if (!window.google || !google.visualization || !google.visualization.GeoChart) {
        return;
    }

    const dadosMapa = new google.visualization.DataTable();
    dadosMapa.addColumn('string', 'Estado');
    dadosMapa.addColumn('number', 'Passageiros');
    dadosMapa.addRows(estados.map(function (estado) {
        return [`BR-${estado.uf}`, Number(estado.passageiros)];
    }));

    const elemento = document.getElementById('mapa_brasil');

    if (!elemento) {
        return;
    }

    const mapa = new google.visualization.GeoChart(elemento);

    google.visualization.events.addListener(mapa, 'select', function () {
        const selecao = mapa.getSelection();
        if (!selecao.length) {
            return;
        }

        const codigo = dadosMapa.getValue(selecao[0].row, 0).replace('BR-', '');
        atualizarResumoMapa(estados, { estado: codigo });
    });

    mapa.draw(dadosMapa, {
        region: 'BR',
        resolution: 'provinces',
        displayMode: 'regions',
        colorAxis: { colors: ['#dfe8ff', cores.azul] },
        backgroundColor: 'transparent',
        datalessRegionColor: 'transparent',
        defaultColor: '#dfe8ff',
        legend: 'none',
        keepAspectRatio: true,
        tooltip: { textStyle: { color: cores.marinho } }
    });
}

async function renderizarGraficos() {
    const tipoPainel = obterPainelAtual();
    const filtro = obterFiltroAtual(tipoPainel);

    try {
        const dados = await carregarPainel(tipoPainel);
        esconderErro();

        if (tipoPainel === 'destinos') {
            renderizarPainelDestinos(dados, filtro);
        } else {
            renderizarPainelCompanhias(dados, filtro);
        }
    } catch (erro) {
        console.log('Erro ao carregar os dados da dashboard.', erro);
        mostrarErro(`Não foi possível carregar os dados do banco: ${erro.message}`);
    }
}

// ---------------------------------------------------------------------------
// Filtros salvos
// ---------------------------------------------------------------------------

function normalizarFiltro(filtro, tipoPainel) {
    filtro = Object.assign({}, filtro);

    filtro.tipo = filtro.tipo || tipoPainel;
    filtro.estados = Array.isArray(filtro.estados) && filtro.estados.length
        ? filtro.estados
        : (filtro.estado && filtro.estado !== 'TODOS' ? [filtro.estado] : []);
    filtro.estado = filtro.estados.length === 1 ? filtro.estados[0] : 'TODOS';
    filtro.companhias = Array.isArray(filtro.companhias) && filtro.companhias.length
        ? filtro.companhias
        : (filtro.companhia && filtro.companhia !== 'TODAS' ? [filtro.companhia] : []);
    filtro.companhia = filtro.companhias.length === 1 ? filtro.companhias[0] : 'TODAS';
    const problemas = Array.isArray(filtro.problemas) && filtro.problemas.length
        ? filtro.problemas
        : (filtro.problema && filtro.problema !== 'TODOS' ? [filtro.problema] : []);
    filtro.problemas = problemas.filter(function (problema, indice, lista) {
        return problema && problema !== 'TODOS' && lista.indexOf(problema) === indice;
    });
    filtro.problema = filtro.problemas.length === 1 ? filtro.problemas[0] : 'TODOS';
    filtro.dataInicial = filtro.dataInicial || '';
    filtro.dataFinal = filtro.dataFinal || '';
    if (filtro.dataInicial === '2025-01-01' && filtro.dataFinal === '2025-12-31') {
        filtro.dataInicial = '2025-11-01';
        filtro.dataFinal = '2025-11-30';
    }
    filtro.nomeEstado = obterNomeEstado(filtro.estado);

    return filtro;
}

function mostrarFiltroAtivo(tipoPainel) {
    const aviso = document.getElementById('aviso_filtro_ativo');
    const textoAviso = document.getElementById('texto_filtro_ativo');
    const filtro = obterFiltroAtual(tipoPainel);

    if (!filtro) {
        aviso.hidden = true;
        textoAviso.textContent = '';
        document.getElementById('botao_editar_filtro').hidden = true;
        return;
    }

    aviso.hidden = false;
    textoAviso.textContent = `Filtro ativo: ${filtro.nome}`;
    document.getElementById('botao_editar_filtro').hidden = false;
}

function removerFiltroAtivo(tipoPainel) {
    localStorage.removeItem(`filtro_atual_${tipoPainel}`);
    mostrarFiltroAtivo(tipoPainel);
    renderizarGraficos();
}

function aplicarFiltroNaDashboard(filtro, tipoPainel) {
    const filtroNormalizado = normalizarFiltro(filtro, tipoPainel);
    localStorage.setItem(`filtro_atual_${tipoPainel}`, JSON.stringify(filtroNormalizado));
    selecionarPainel(tipoPainel);
    mostrarFiltroAtivo(tipoPainel);
}

function mostrarFiltrosSalvos() {
    const tipoPainel = obterPainelAtual();
    const listaFiltros = document.getElementById('lista_filtros');
    const filtrosSalvos = JSON.parse(localStorage.getItem(obterChaveFiltros(tipoPainel)) || '[]');

    listaFiltros.innerHTML = '';

    if (filtrosSalvos.length === 0) {
        const mensagem = document.createElement('p');
        mensagem.className = 'mensagem_lista';
        mensagem.textContent = 'Você ainda não criou nenhum filtro.';
        listaFiltros.appendChild(mensagem);
        return;
    }

    filtrosSalvos.forEach(function (filtroSalvo, indice) {
        const filtro = normalizarFiltro(filtroSalvo, tipoPainel);
        const partes = [filtro.estados.length
            ? filtro.estados.map(obterNomeEstado).join(', ')
            : obterNomeEstado(filtro.estado)];

        if (tipoPainel === 'companhias') {
            partes.push(filtro.companhias.length
                ? filtro.companhias.map(obterNomeCompanhia).join(', ')
                : obterNomeCompanhia(filtro.companhia));
            partes.push(filtro.problemas.length ? filtro.problemas.join(', ') : 'Todos os problemas');
        }
        partes.push(obterTextoDoPeriodo(filtro));

        const cartaoFiltro = document.createElement('article');
        cartaoFiltro.className = 'cartao_filtro_salvo';
        const detalhesFiltro = document.createElement('div');
        const nomeFiltro = document.createElement('h3');
        const resumoFiltro = document.createElement('p');
        const acoesFiltro = document.createElement('div');
        const botaoAplicar = document.createElement('button');
        const botaoEditar = document.createElement('button');
        const botaoExcluir = document.createElement('button');

        nomeFiltro.textContent = filtro.nome;
        resumoFiltro.textContent = partes.join(' · ');
        acoesFiltro.className = 'acoes_filtro_salvo';
        botaoAplicar.className = 'botao_aplicar_filtro';
        botaoAplicar.type = 'button';
        botaoAplicar.textContent = 'Aplicar';
        botaoAplicar.dataset.indice = indice;
        botaoEditar.className = 'botao_editar_filtro_salvo';
        botaoEditar.type = 'button';
        botaoEditar.textContent = 'Editar';
        botaoEditar.dataset.indice = indice;
        botaoExcluir.className = 'botao_excluir_filtro';
        botaoExcluir.type = 'button';
        botaoExcluir.textContent = 'Excluir';
        botaoExcluir.dataset.indice = indice;
        botaoExcluir.dataset.id = filtro.id;

        detalhesFiltro.appendChild(nomeFiltro);
        detalhesFiltro.appendChild(resumoFiltro);
        acoesFiltro.appendChild(botaoAplicar);
        acoesFiltro.appendChild(botaoEditar);
        acoesFiltro.appendChild(botaoExcluir);
        cartaoFiltro.appendChild(detalhesFiltro);
        cartaoFiltro.appendChild(acoesFiltro);
        listaFiltros.appendChild(cartaoFiltro);
    });

    document.querySelectorAll('.botao_aplicar_filtro').forEach(function (botao) {
        botao.addEventListener('click', function () {
            aplicarFiltroNaDashboard(filtrosSalvos[botao.dataset.indice], tipoPainel);
            document.getElementById('modal_filtros').hidden = true;
        });
    });

    document.querySelectorAll('.botao_editar_filtro_salvo').forEach(function (botao) {
        botao.addEventListener('click', function () {
            const filtro = filtrosSalvos[botao.dataset.indice];
            window.location.href = `filtros_criacao.html?tipo=${tipoPainel}&editar=${encodeURIComponent(filtro.id)}`;
        });
    });

    document.querySelectorAll('.botao_excluir_filtro').forEach(function (botao) {
        botao.addEventListener('click', function () {
            if (!confirm('Tem certeza que deseja excluir este filtro?')) {
                return;
            }

            filtrosSalvos.splice(botao.dataset.indice, 1);
            localStorage.setItem(obterChaveFiltros(tipoPainel), JSON.stringify(filtrosSalvos));

            const filtroAtivo = obterFiltroAtual(tipoPainel);
            if (filtroAtivo && String(filtroAtivo.id) === String(botao.dataset.id)) {
                localStorage.removeItem(`filtro_atual_${tipoPainel}`);
                renderizarGraficos();
                mostrarFiltroAtivo(tipoPainel);
            }
            mostrarFiltrosSalvos();
        });
    });
}

function selecionarPainel(tipoPainel) {
    const painelCompanhiasPermitido = !document.getElementById('seletor_dashboard').hidden;
    let painelEscolhido = tipoPainel;

    if (painelEscolhido === 'companhias' && !painelCompanhiasPermitido) {
        painelEscolhido = 'destinos';
    }

    document.querySelectorAll('.opcao_dashboard').forEach(function (opcao) {
        opcao.classList.toggle('ativa', opcao.dataset.painel === painelEscolhido);
    });

    document.getElementById('painel_destinos').hidden = painelEscolhido !== 'destinos';
    document.getElementById('painel_companhias').hidden = painelEscolhido !== 'companhias';
    document.getElementById('botao_criar_filtro').href = `filtros_criacao.html?tipo=${painelEscolhido}`;
    sessionStorage.PAINEL_DASHBOARD = painelEscolhido;
    mostrarFiltroAtivo(painelEscolhido);
    return renderizarGraficos();
}

function definirTipoUsuario() {
    const tipoUsuario = (sessionStorage.SETOR_ATUACAO || 'AGENCIA').toUpperCase();
    const usuarioAgencia = tipoUsuario.includes('AGENC');

    document.getElementById('seletor_dashboard').hidden = !usuarioAgencia;
    document.getElementById('nome_usuario_dashboard').textContent =
        sessionStorage.NOME_USUARIO || 'Aircode';

    if (!usuarioAgencia) {
        document.getElementById('painel_companhias').hidden = true;
    }
}


function esperarAtualizacaoDaTela() {
    return new Promise(function (resolver) {
        requestAnimationFrame(function () {
            requestAnimationFrame(resolver);
        });
    });
}

async function gerarRelatorioPDF() {
    const botaoRelatorio = document.getElementById('botao_relatorio');
    const textoOriginal = botaoRelatorio.textContent;

    if (typeof html2canvas === 'undefined' || !window.jspdf) {
        alert('Não foi possível carregar as ferramentas para gerar o PDF. Verifique a sua internet.');
        return;
    }

    botaoRelatorio.disabled = true;
    botaoRelatorio.textContent = 'Gerando PDF...';

    const painelDestinos = document.getElementById('painel_destinos');
    const painelCompanhias = document.getElementById('painel_companhias');
    const destinosEstavaOculto = painelDestinos.hidden;
    const companhiasEstavaOculto = painelCompanhias.hidden;
    const paineisRelatorio = [
        { elemento: painelDestinos, titulo: 'Dashboard de destinos' }
    ];

    if (!document.getElementById('seletor_dashboard').hidden) {
        paineisRelatorio.push({ elemento: painelCompanhias, titulo: 'Dashboard de companhias' });
    }

    try {
        const PDF = window.jspdf.jsPDF;
        const documento = new PDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        for (let indice = 0; indice < paineisRelatorio.length; indice++) {
            const painel = paineisRelatorio[indice];
            painel.elemento.hidden = false;

            Object.values(graficos).forEach(function (grafico) {
                grafico.resize();
            });

            await esperarAtualizacaoDaTela();

            const imagemPainel = await html2canvas(painel.elemento, {
                scale: 1.5,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false
            });

            if (indice > 0) {
                documento.addPage('a4', 'landscape');
            }

            documento.setFillColor(16, 11, 77);
            documento.rect(0, 0, 297, 18, 'F');
            documento.setTextColor(255, 255, 255);
            documento.setFontSize(15);
            documento.text(`Aircode - ${painel.titulo}`, 10, 11);
            documento.setFontSize(9);
            documento.text(new Date().toLocaleDateString('pt-BR'), 270, 11);

            const imagem = imagemPainel.toDataURL('image/png');
            const proporcao = Math.min(
                277 / imagemPainel.width,
                178 / imagemPainel.height
            );
            const larguraImagem = imagemPainel.width * proporcao;
            const alturaImagem = imagemPainel.height * proporcao;

            documento.addImage(imagem, 'PNG', (297 - larguraImagem) / 2, 24, larguraImagem, alturaImagem);
            painel.elemento.hidden = true;
        }

        documento.save(`relatorio-aircode-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (erro) {
        console.log('Erro ao gerar o relatório em PDF.', erro);
        alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
        painelDestinos.hidden = destinosEstavaOculto;
        painelCompanhias.hidden = companhiasEstavaOculto;
        botaoRelatorio.disabled = false;
        botaoRelatorio.textContent = textoOriginal;

        Object.values(graficos).forEach(function (grafico) {
            grafico.resize();
        });
    }
}

function configurarEventos() {
    document.getElementById('fechar_popup_alerta').addEventListener('click', mostrarProximoAlerta);
    document.getElementById('abrir_popup_alerta').addEventListener('click', abrirAlertaNaDashboard);
    document.getElementById('abrir_popup_alerta').addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            abrirAlertaNaDashboard();
        }
    });

    document.querySelectorAll('.opcao_dashboard').forEach(function (botao) {
        botao.addEventListener('click', function () {
            selecionarPainel(botao.dataset.painel);
        });
    });

    document.getElementById('botao_filtros').addEventListener('click', function () {
        document.getElementById('botao_criar_filtro').href =
            `filtros_criacao.html?tipo=${obterPainelAtual()}`;
        document.getElementById('modal_filtros').hidden = false;
        mostrarFiltrosSalvos();
    });

    document.getElementById('botao_fechar_filtros').addEventListener('click', function () {
        document.getElementById('modal_filtros').hidden = true;
    });

    document.getElementById('botao_remover_filtro').addEventListener('click', function () {
        removerFiltroAtivo(obterPainelAtual());
    });

    document.getElementById('botao_editar_filtro').addEventListener('click', function () {
        const tipoPainel = obterPainelAtual();
        const filtro = obterFiltroAtual(tipoPainel);
        if (filtro) {
            window.location.href = `filtros_criacao.html?tipo=${tipoPainel}&editar=${encodeURIComponent(filtro.id)}`;
        }
    });

    document.getElementById('botao_relatorio').addEventListener('click', gerarRelatorioPDF);
}

function receberNovoFiltroDaUrl(parametrosUrl) {
    const filtroRecebido = parametrosUrl.get('novoFiltro');

    if (!filtroRecebido) {
        return;
    }

    try {
        const novoFiltro = JSON.parse(filtroRecebido);
        const tipoPainel = novoFiltro.tipo === 'companhias' ? 'companhias' : 'destinos';
        const chaveFiltros = obterChaveFiltros(tipoPainel);
        const filtrosSalvos = JSON.parse(localStorage.getItem(chaveFiltros) || '[]');
        const indiceFiltro = filtrosSalvos.findIndex(function (filtro) {
            return String(filtro.id) === String(novoFiltro.id);
        });

        if (indiceFiltro < 0) {
            filtrosSalvos.push(novoFiltro);
        } else {
            filtrosSalvos[indiceFiltro] = novoFiltro;
        }

        localStorage.setItem(chaveFiltros, JSON.stringify(filtrosSalvos));
        localStorage.setItem(
            `filtro_atual_${tipoPainel}`,
            JSON.stringify(normalizarFiltro(novoFiltro, tipoPainel))
        );
        window.history.replaceState({}, '', `dashboard.html?painel=${tipoPainel}`);
    } catch (erro) {
        console.log('Não foi possível receber o novo filtro.', erro);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    definirTipoUsuario();
    configurarEventos();

    if (window.google) {
        google.charts.load('current', { packages: ['geochart'], language: 'pt-BR' });
        google.charts.setOnLoadCallback(function () {
            limparCache();
            renderizarGraficos();
        });
    }

    try {
        await carregarOpcoesFiltro();
    } catch (erro) {
        console.log('Erro ao carregar as opções de filtro.', erro);
        mostrarErro(`Não foi possível carregar os dados do banco: ${erro.message}`);
        return;
    }

    const parametrosUrl = new URLSearchParams(window.location.search);
    receberNovoFiltroDaUrl(parametrosUrl);
    const painelInicial = parametrosUrl.get('painel')
        || sessionStorage.PAINEL_DASHBOARD
        || 'destinos';
    selecionarPainel(painelInicial);
    verificarAlertasAtivos();
    window.setInterval(verificarAlertasAtivos, 60000);
});
