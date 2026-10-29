const graficos = {};
const cores = {
    azul: '#1B39D6',
    marinho: '#0C1B4D',
    amarelo: '#F5C518',
    cinza: '#76809c'
};

const meses = [
    { numero: 1, dias: 31, peso: 0.78 },
    { numero: 2, dias: 28, peso: 0.76 },
    { numero: 3, dias: 31, peso: 0.82 },
    { numero: 4, dias: 30, peso: 0.86 },
    { numero: 5, dias: 31, peso: 0.91 },
    { numero: 6, dias: 30, peso: 1.04 },
    { numero: 7, dias: 31, peso: 1.18 },
    { numero: 8, dias: 31, peso: 0.95 },
    { numero: 9, dias: 30, peso: 0.87 },
    { numero: 10, dias: 31, peso: 0.9 },
    { numero: 11, dias: 30, peso: 0.92 },
    { numero: 12, dias: 31, peso: 1.01 }
];
const companhiasBase = [
    { nome: 'LATAM', participacao: 0.4, reclamacoes: 0.029, resolucao: 0.81, avaliacao: 4.4 },
    { nome: 'GOL', participacao: 0.32, reclamacoes: 0.026, resolucao: 0.86, avaliacao: 4.8 },
    { nome: 'Azul', participacao: 0.28, reclamacoes: 0.023, resolucao: 0.89, avaliacao: 4.6 }
];
const problemasBase = [
    { nome: 'Cancelamento', participacao: 0.38 },
    { nome: 'Atraso', participacao: 0.31 },
    { nome: 'Extravio de bagagem', participacao: 0.2 },
    { nome: 'Outros', participacao: 0.11 }
];

function obterTaxaResolucao(companhia, problema) {
    const ajustePorProblema = {
        'Cancelamento': -0.08,
        'Atraso': -0.02,
        'Extravio de bagagem': -0.14,
        'Outros': 0.03
    };
    const taxa = companhia.resolucao + (ajustePorProblema[problema] || 0);
    return Math.min(0.98, Math.max(0.55, taxa));
}

const estadosBrasil = [
    ['BR-AC', 'Acre', 18], ['BR-AL', 'Alagoas', 350], ['BR-AP', 'Amapá', 12],
    ['BR-AM', 'Amazonas', 25], ['BR-BA', 'Bahia', 520], ['BR-CE', 'Ceará', 180],
    ['BR-DF', 'Distrito Federal', 210], ['BR-ES', 'Espírito Santo', 160],
    ['BR-GO', 'Goiás', 190], ['BR-MA', 'Maranhão', 80], ['BR-MT', 'Mato Grosso', 70],
    ['BR-MS', 'Mato Grosso do Sul', 62], ['BR-MG', 'Minas Gerais', 300], ['BR-PA', 'Pará', 95],
    ['BR-PB', 'Paraíba', 75], ['BR-PR', 'Paraná', 260], ['BR-PE', 'Pernambuco', 230],
    ['BR-PI', 'Piauí', 45], ['BR-RJ', 'Rio de Janeiro', 760], ['BR-RN', 'Rio Grande do Norte', 90],
    ['BR-RS', 'Rio Grande do Sul', 220], ['BR-RO', 'Rondônia', 30], ['BR-RR', 'Roraima', 10],
    ['BR-SC', 'Santa Catarina', 240], ['BR-SP', 'São Paulo', 980], ['BR-SE', 'Sergipe', 35],
    ['BR-TO', 'Tocantins', 28]
];

function criarDadosDeVoos() {
    const dados = [];
    const somaPesosMeses = meses.reduce(function (total, mes) {
        return total + mes.peso;
    }, 0);

    estadosBrasil.forEach(function (estado) {
        meses.forEach(function (mes) {
            companhiasBase.forEach(function (companhia) {
                const voos = estado[2] * (mes.peso / somaPesosMeses) * companhia.participacao;
                dados.push({
                    estado: estado[0].replace('BR-', ''),
                    nomeEstado: estado[1],
                    mes: mes,
                    companhia: companhia.nome,
                    voos: voos
                });
            });
        });
    });

    return dados;
}

const dadosDeVoos = criarDadosDeVoos();

function obterFracaoDoMes(mes, filtro) {
    if (!filtro || (!filtro.dataInicial && !filtro.dataFinal)) {
        return 1;
    }

    const inicioMes = new Date(2025, mes.numero - 1, 1);
    const fimMes = new Date(2025, mes.numero, 0);
    const inicioFiltro = filtro.dataInicial ? new Date(`${filtro.dataInicial}T00:00:00`) : inicioMes;
    const fimFiltro = filtro.dataFinal ? new Date(`${filtro.dataFinal}T23:59:59`) : fimMes;
    const inicio = inicioFiltro > inicioMes ? inicioFiltro : inicioMes;
    const fim = fimFiltro < fimMes ? fimFiltro : fimMes;

    if (inicio > fim) {
        return 0;
    }

    const diasIncluidos = Math.floor((fim - inicio) / 86400000) + 1;
    return diasIncluidos / mes.dias;
}

function obterDadosDeVoosFiltrados(tipoPainel) {
    const filtro = obterFiltroAtual(tipoPainel);

    return dadosDeVoos.filter(function (linha) {
        const estadoCombina = !filtro || filtro.estado === 'TODOS' || filtro.estado === linha.estado;
        const companhiaCombina = !filtro || filtro.companhia === 'TODAS' || filtro.companhia === linha.companhia;
        return estadoCombina && companhiaCombina && obterFracaoDoMes(linha.mes, filtro) > 0;
    }).map(function (linha) {
        return {
            estado: linha.estado,
            nomeEstado: linha.nomeEstado,
            mes: linha.mes,
            companhia: linha.companhia,
            voos: linha.voos * obterFracaoDoMes(linha.mes, filtro)
        };
    });
}

function obterDadosDeReclamacoes(tipoPainel) {
    const filtro = obterFiltroAtual(tipoPainel);
    const dadosFiltrados = obterDadosDeVoosFiltrados(tipoPainel);
    const dados = [];

    dadosFiltrados.forEach(function (linha) {
        const companhia = companhiasBase.find(function (item) {
            return item.nome === linha.companhia;
        });
        const totalReclamacoes = linha.voos * companhia.reclamacoes;

        problemasBase.forEach(function (problema) {
            const combinaProblema = !filtro || filtro.problema === 'TODOS' || filtro.problema === problema.nome;
            if (combinaProblema) {
                dados.push({
                    estado: linha.estado,
                    mes: linha.mes,
                    companhia: linha.companhia,
                    problema: problema.nome,
                    quantidade: totalReclamacoes * problema.participacao
                });
            }
        });
    });

    return dados;
}

function formatarQuantidade(numero) {
    const casasDecimais = numero > 0 && numero < 10 ? 1 : 0;
    return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: casasDecimais,
        maximumFractionDigits: casasDecimais
    });
}

function formatarReais(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
    });
}

function somarPor(dados, chave, valor) {
    return dados.reduce(function (resultado, linha) {
        resultado[linha[chave]] = (resultado[linha[chave]] || 0) + linha[valor];
        return resultado;
    }, {});
}

function obterPercentualResolucao(companhia, dadosReclamacoes) {
    const reclamacoes = dadosReclamacoes.filter(function (linha) {
        return linha.companhia === companhia.nome;
    });
    const total = reclamacoes.reduce(function (soma, linha) {
        return soma + linha.quantidade;
    }, 0);

    if (!total) {
        return companhia.resolucao * 100;
    }

    const resolvidas = reclamacoes.reduce(function (soma, linha) {
        return soma + (linha.quantidade * obterTaxaResolucao(companhia, linha.problema));
    }, 0);
    return (resolvidas / total) * 100;
}

function obterFiltroAtual(tipoPainel) {
    return JSON.parse(localStorage.getItem(`filtro_atual_${tipoPainel}`) || 'null');
}

function obterTotalVoos(dados) {
    return dados.reduce(function (total, linha) {
        return total + linha.voos;
    }, 0);
}

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

function definirTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = texto;
    }
}

function obterTextoDoPeriodo(filtro) {
    if (!filtro || (!filtro.dataInicial && !filtro.dataFinal)) {
        return 'Todo o período disponível';
    }

    const inicio = filtro.dataInicial
        ? new Date(`${filtro.dataInicial}T00:00:00`).toLocaleDateString('pt-BR')
        : 'início';
    const fim = filtro.dataFinal
        ? new Date(`${filtro.dataFinal}T00:00:00`).toLocaleDateString('pt-BR')
        : 'hoje';
    return `${inicio} a ${fim}`;
}

function atualizarIndicadoresDestinos(dadosVoos) {
    const filtro = obterFiltroAtual(obterPainelAtual());
    const totaisEstado = somarPor(dadosVoos, 'estado', 'voos');
    const estadosOrdenados = Object.keys(totaisEstado).sort(function (a, b) {
        return totaisEstado[b] - totaisEstado[a];
    });
    const topTres = estadosOrdenados.slice(0, 3);
    const melhorEstado = estadosOrdenados[0];
    const totalVoos = obterTotalVoos(dadosVoos);
    const nomeEstadoDestaque = estadosBrasil.find(function (estado) {
        return estado[0] === `BR-${melhorEstado}`;
    });

    definirTexto('kpi_destinos_titulo', topTres.length ? 'Destinos mais procurados' : 'Destinos no período');
    definirTexto('kpi_destinos_valor', topTres.length
        ? topTres.map(function (estado, indice) {
            return `${indice + 1}º ${estado} (${formatarQuantidade(totaisEstado[estado])})`;
        }).join(' · ')
        : 'Sem dados para este filtro');
    definirTexto('kpi_estado_destaque', nomeEstadoDestaque ? nomeEstadoDestaque[1] : 'Sem dados');
    definirTexto('kpi_estado_destaque_detalhe', `${formatarQuantidade(totaisEstado[melhorEstado] || 0)} voos no período`);
    definirTexto('kpi_faturamento', formatarReais(totalVoos * 660.54));
    definirTexto('kpi_faturamento_detalhe', `${formatarQuantidade(totalVoos)} voos · R$ 660,54 por voo (Fonte: Anac) · ${obterTextoDoPeriodo(filtro)}`);
}

function atualizarIndicadoresCompanhias(dadosVoos, dadosReclamacoes) {
    const filtro = obterFiltroAtual(obterPainelAtual());
    const totaisPorCompanhia = somarPor(dadosVoos, 'companhia', 'voos');
    const reclamacoesPorCompanhia = somarPor(dadosReclamacoes, 'companhia', 'quantidade');
    const reclamacoesPorProblema = somarPor(dadosReclamacoes, 'problema', 'quantidade');
    const companhiasVisiveis = Object.keys(totaisPorCompanhia);
    const totalReclamacoes = Object.values(reclamacoesPorCompanhia).reduce(function (total, valor) {
        return total + valor;
    }, 0);
    let pesoAvaliacoes = 0;
    let totalAvaliacoes = 0;
    let totalResolvidas = 0;

    companhiasVisiveis.forEach(function (nome) {
        const companhia = companhiasBase.find(function (item) {
            return item.nome === nome;
        });
        pesoAvaliacoes += companhia.avaliacao * (totaisPorCompanhia[nome] || 0);
        totalAvaliacoes += totaisPorCompanhia[nome] || 0;
        dadosReclamacoes.filter(function (linha) {
            return linha.companhia === nome;
        }).forEach(function (linha) {
            totalResolvidas += linha.quantidade * obterTaxaResolucao(companhia, linha.problema);
        });
    });

    const problemaMaisFrequente = Object.keys(reclamacoesPorProblema).sort(function (a, b) {
        return reclamacoesPorProblema[b] - reclamacoesPorProblema[a];
    })[0];

    definirTexto('kpi_avaliacao', totalAvaliacoes ? `${(pesoAvaliacoes / totalAvaliacoes).toFixed(1).replace('.', ',')}/5` : '—');
    const textoCompanhias = companhiasVisiveis.length === 1 ? '1 companhia' : `${companhiasVisiveis.length} companhias`;
    definirTexto('kpi_avaliacao_detalhe', `${textoCompanhias} · ${obterTextoDoPeriodo(filtro)}`);
    definirTexto('kpi_resolucao', totalReclamacoes ? `${Math.round((totalResolvidas / totalReclamacoes) * 100)}%` : '—');
    definirTexto('kpi_resolucao_detalhe', totalReclamacoes ? 'das reclamações estimadas foram resolvidas em 5 dias' : 'Sem reclamações neste período');
    definirTexto('kpi_reclamacoes', formatarQuantidade(totalReclamacoes));
    definirTexto('kpi_reclamacoes_detalhe', `estimativa · ${obterTextoDoPeriodo(filtro)}`);
    definirTexto('kpi_problema', problemaMaisFrequente || 'Sem dados');
    definirTexto('kpi_problema_detalhe', problemaMaisFrequente
        ? `${formatarQuantidade(reclamacoesPorProblema[problemaMaisFrequente])} reclamações estimadas`
        : 'Nenhuma reclamação para este filtro');
}

function atualizarTitulos(tipoPainel) {
    const filtro = obterFiltroAtual(tipoPainel);
    const partesVoos = [];
    const partesReclamacoes = [];

    if (filtro && filtro.estado !== 'TODOS') {
        partesVoos.push(obterNomeEstado(filtro.estado));
        partesReclamacoes.push(obterNomeEstado(filtro.estado));
    }
    if (tipoPainel === 'companhias' && filtro && filtro.companhia !== 'TODAS') {
        partesVoos.push(filtro.companhia);
        partesReclamacoes.push(filtro.companhia);
    }
    if (tipoPainel === 'companhias' && filtro && filtro.problema !== 'TODOS') {
        partesReclamacoes.push(filtro.problema);
    }
    const periodo = obterTextoDoPeriodo(filtro);
    const contextoVoos = filtro
        ? ` · ${partesVoos.concat(periodo).join(' · ')}`
        : '';
    const contextoReclamacoes = filtro
        ? ` · ${partesReclamacoes.concat(periodo).join(' · ')}`
        : '';

    definirTexto('titulo_grafico_origem_destino', `Voos por estado${contextoVoos}`);
    definirTexto('titulo_grafico_mapa', `Volume de voos${contextoVoos}`);
    definirTexto('titulo_grafico_origem_bahia', `Voos por companhia${contextoVoos}`);
    definirTexto('titulo_grafico_problemas', filtro && filtro.problema !== 'TODOS'
        ? `Reclamações por companhia${contextoReclamacoes}`
        : `Reclamações por problema${contextoReclamacoes}`);
    definirTexto('titulo_grafico_assentos', `Voos por companhia${contextoVoos}`);
    definirTexto('titulo_grafico_resolucao', `Taxa de resolução${contextoReclamacoes}`);
}

function renderizarGraficos() {
    const tipoPainel = obterPainelAtual();
    const dadosVoos = obterDadosDeVoosFiltrados(tipoPainel);
    const dadosReclamacoes = obterDadosDeReclamacoes(tipoPainel);
    const filtro = obterFiltroAtual(tipoPainel);
    atualizarTitulos(tipoPainel);
    atualizarIndicadoresDestinos(dadosVoos);
    atualizarIndicadoresCompanhias(dadosVoos, dadosReclamacoes);

    if (typeof Chart === 'undefined') {
        document.querySelectorAll('canvas').forEach(function (canvas) {
            canvas.replaceWith('Não foi possível carregar o gráfico agora.');
        });
        return;
    }

    const voosPorEstado = somarPor(dadosVoos, 'estado', 'voos');
    const estadosOrdenados = Object.keys(voosPorEstado).sort(function (a, b) {
        return voosPorEstado[b] - voosPorEstado[a];
    }).slice(0, 8);
    const voosPorCompanhia = somarPor(dadosVoos, 'companhia', 'voos');
    const reclamacoesPorCompanhia = somarPor(dadosReclamacoes, 'companhia', 'quantidade');
    const reclamacoesPorProblema = somarPor(dadosReclamacoes, 'problema', 'quantidade');
    const estadosLabel = estadosOrdenados.map(function (codigo) {
        return codigo;
    });
    const voosEstado = estadosOrdenados.map(function (codigo) {
        return voosPorEstado[codigo];
    });

    criarGrafico('grafico_origem_destino', 'bar', {
        labels: estadosLabel,
        datasets: [{
            label: 'Voos',
            data: voosEstado,
            backgroundColor: cores.marinho,
            borderRadius: 5,
            maxBarThickness: 44
        }]
    }, {
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (contexto) {
                        return `${formatarQuantidade(contexto.raw)} voos`;
                    }
                }
            }
        }
    });

    criarGrafico('grafico_origem_bahia', 'doughnut', {
        labels: companhiasBase.map(function (companhia) { return companhia.nome; }),
        datasets: [{
            data: companhiasBase.map(function (companhia) {
                return voosPorCompanhia[companhia.nome] || 0;
            }),
            backgroundColor: [cores.marinho, cores.azul, cores.amarelo],
            borderColor: '#f5f6fa',
            borderWidth: 3
        }]
    }, {
        cutout: '58%',
        scales: {
            x: { display: false },
            y: { display: false }
        },
        plugins: {
            legend: { position: 'bottom' }
        }
    });

    const companhiasSelecionadas = companhiasBase.filter(function (companhia) {
        return (voosPorCompanhia[companhia.nome] || 0) > 0;
    });
    const problemaSelecionado = filtro && filtro.problema !== 'TODOS';
    const problemas = problemaSelecionado ? [filtro.problema] : problemasBase.map(function (problema) {
        return problema.nome;
    });
    const valoresProblemas = problemas.map(function (problema) {
        return reclamacoesPorProblema[problema] || 0;
    });

    criarGrafico('grafico_problemas', problemaSelecionado ? 'bar' : 'pie', {
        labels: problemaSelecionado
            ? companhiasSelecionadas.map(function (companhia) { return companhia.nome; })
            : problemas,
        datasets: [{
            label: problemaSelecionado ? 'Reclamações' : 'Reclamações estimadas',
            data: problemaSelecionado
                ? companhiasSelecionadas.map(function (companhia) {
                    return dadosReclamacoes.filter(function (linha) {
                        return linha.companhia === companhia.nome && linha.problema === filtro.problema;
                    }).reduce(function (total, linha) { return total + linha.quantidade; }, 0);
                })
                : valoresProblemas,
            backgroundColor: [cores.marinho, '#7d86a3', cores.azul, cores.amarelo],
            borderColor: '#f5f6fa',
            borderWidth: 3
        }]
    }, {
        plugins: {
            legend: { position: problemaSelecionado ? 'top' : 'bottom' }
        },
        scales: problemaSelecionado ? {
            y: { beginAtZero: true, grid: { color: '#e3e7ef' } },
            x: { grid: { display: false } }
        } : {}
    });

    criarGrafico('grafico_assentos', 'bar', {
        labels: companhiasSelecionadas.map(function (companhia) { return companhia.nome; }),
        datasets: [{
            label: 'Voos',
            data: companhiasSelecionadas.map(function (companhia) {
                return voosPorCompanhia[companhia.nome] || 0;
            }),
            backgroundColor: cores.marinho,
            borderRadius: 5,
            maxBarThickness: 42
        }]
    }, {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, grid: { color: '#e3e7ef' } }, y: { grid: { display: false } } }
    });

    criarGrafico('grafico_resolucao', 'bar', {
        labels: companhiasSelecionadas.map(function (companhia) { return companhia.nome; }),
        datasets: [
            {
                label: 'Resolvido (%)',
                data: companhiasSelecionadas.map(function (companhia) {
                    return obterPercentualResolucao(companhia, dadosReclamacoes);
                }),
                backgroundColor: cores.azul,
                borderRadius: 4
            },
            {
                label: 'Não resolvido (%)',
                data: companhiasSelecionadas.map(function (companhia) {
                    return 100 - obterPercentualResolucao(companhia, dadosReclamacoes);
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

    if (window.google && google.visualization && tipoPainel === 'destinos') {
        desenharMapa();
    }
}

function atualizarResumoMapa(nomeEstado, quantidadeVoos) {
    const totalVoos = obterTotalVoos(obterDadosDeVoosFiltrados('destinos'));
    const porcentagem = totalVoos ? ((quantidadeVoos / totalVoos) * 100).toFixed(1).replace('.', ',') : '0,0';
    document.getElementById('resumo_mapa').textContent =
        `${nomeEstado}: ${formatarQuantidade(quantidadeVoos)} voos (${porcentagem}% do resultado filtrado).`;
}

function desenharMapa() {
    if (!window.google || !google.visualization) {
        return;
    }

    const dadosVoos = obterDadosDeVoosFiltrados('destinos');
    const totaisPorEstado = somarPor(dadosVoos, 'estado', 'voos');
    const filtro = obterFiltroAtual('destinos');
    const dadosMapa = new google.visualization.DataTable();
    dadosMapa.addColumn('string', 'Estado');
    dadosMapa.addColumn('number', 'Voos');
    dadosMapa.addRows(estadosBrasil.map(function (estado) {
        const codigo = estado[0].replace('BR-', '');
        return [estado[0], totaisPorEstado[codigo] || 0];
    }));

    const mapa = new google.visualization.GeoChart(document.getElementById('mapa_brasil'));
    google.visualization.events.addListener(mapa, 'select', function () {
        const selecao = mapa.getSelection();
        if (!selecao.length) {
            return;
        }

        const codigoEstado = dadosMapa.getValue(selecao[0].row, 0);
        const estado = estadosBrasil.find(function (item) {
            return item[0] === codigoEstado;
        });
        if (estado) {
            atualizarResumoMapa(estado[1], totaisPorEstado[estado[0].replace('BR-', '')] || 0);
        }
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

    const estadoFiltrado = filtro && filtro.estado !== 'TODOS'
        ? estadosBrasil.find(function (estado) { return estado[0] === `BR-${filtro.estado}`; })
        : null;
    if (estadoFiltrado) {
        atualizarResumoMapa(estadoFiltrado[1], totaisPorEstado[filtro.estado] || 0);
    } else {
        const estadoDestaque = Object.keys(totaisPorEstado).sort(function (a, b) {
            return totaisPorEstado[b] - totaisPorEstado[a];
        })[0];
        const estado = estadosBrasil.find(function (item) {
            return item[0] === `BR-${estadoDestaque}`;
        });
        document.getElementById('resumo_mapa').textContent = estado
            ? `${estado[1]} lidera o período com ${formatarQuantidade(totaisPorEstado[estadoDestaque])} voos.`
            : 'Sem voos para mostrar neste período.';
    }
}

function definirTipoUsuario() {
    const tipoUsuario = (sessionStorage.SETOR_ATUACAO || 'AGENCIA').toUpperCase();
    const usuarioAgencia = tipoUsuario.includes('AGENC');

    document.getElementById('seletor_dashboard').hidden = !usuarioAgencia;
    document.getElementById('nome_usuario_dashboard').textContent = sessionStorage.NOME_USUARIO || 'Aircode';

    if (!usuarioAgencia) {
        document.getElementById('painel_companhias').hidden = true;
    }
}

function obterPainelAtual() {
    const opcaoAtiva = document.querySelector('.opcao_dashboard.ativa');
    return opcaoAtiva ? opcaoAtiva.dataset.painel : 'destinos';
}

function obterChaveFiltros(tipoPainel) {
    return tipoPainel === 'companhias' ? 'filtros_companhias' : 'filtros_destinos';
}

function obterNomeEstado(codigoEstado) {
    if (codigoEstado === 'TODOS') {
        return 'Todos os estados';
    }

    const estado = estadosBrasil.find(function (item) {
        return item[0] === `BR-${codigoEstado}` || item[1] === codigoEstado;
    });

    return estado ? estado[1] : codigoEstado;
}

function normalizarFiltro(filtro, tipoPainel) {
    filtro = Object.assign({}, filtro);
    if (filtro.estado === 'Todos os estados') {
        filtro.estado = 'TODOS';
    }
    if (filtro.companhia === 'Todas as companhias') {
        filtro.companhia = 'TODAS';
    }
    if (filtro.problema === 'Todos os problemas') {
        filtro.problema = 'TODOS';
    }

    const estadoEncontrado = estadosBrasil.find(function (estado) {
        return estado[1] === filtro.estado;
    });

    if (estadoEncontrado) {
        filtro.estado = estadoEncontrado[0].replace('BR-', '');
    }

    filtro.tipo = filtro.tipo || tipoPainel;
    filtro.nomeEstado = filtro.nomeEstado || obterNomeEstado(filtro.estado);
    filtro.companhia = filtro.companhia || 'TODAS';
    filtro.problema = filtro.problema || 'TODOS';
    filtro.dataInicial = filtro.dataInicial || '';
    filtro.dataFinal = filtro.dataFinal || '';
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
        const textoCompanhia = tipoPainel === 'companhias'
            ? ` · ${filtro.companhia === 'TODAS' ? 'Todas as companhias' : filtro.companhia}`
            : '';
        const textoProblema = tipoPainel === 'companhias'
            ? ` · ${filtro.problema === 'TODOS' ? 'Todos os problemas' : filtro.problema}`
            : '';
        const textoPeriodo = filtro.dataInicial || filtro.dataFinal
            ? ` · ${obterTextoDoPeriodo(filtro)}`
            : '';
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
        resumoFiltro.textContent = `${obterNomeEstado(filtro.estado)}${textoCompanhia}${textoProblema}${textoPeriodo}`;
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
            const filtro = filtrosSalvos[botao.dataset.indice];
            aplicarFiltroNaDashboard(filtro, tipoPainel);
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
            const confirmouExclusao = confirm('Tem certeza que deseja excluir este filtro?');

            if (!confirmouExclusao) {
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
    renderizarGraficos();
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
        const documento = new PDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

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
            const larguraMaxima = 277;
            const alturaMaxima = 178;
            const proporcao = Math.min(
                larguraMaxima / imagemPainel.width,
                alturaMaxima / imagemPainel.height
            );
            const larguraImagem = imagemPainel.width * proporcao;
            const alturaImagem = imagemPainel.height * proporcao;
            const posicaoX = (297 - larguraImagem) / 2;

            documento.addImage(imagem, 'PNG', posicaoX, 24, larguraImagem, alturaImagem);
            painel.elemento.hidden = true;
        }

        const dataArquivo = new Date().toISOString().slice(0, 10);
        documento.save(`relatorio-aircode-${dataArquivo}.pdf`);
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
    document.querySelectorAll('.opcao_dashboard').forEach(function (botao) {
        botao.addEventListener('click', function () {
            selecionarPainel(botao.dataset.painel);
        });
    });

    document.getElementById('botao_filtros').addEventListener('click', function () {
        document.getElementById('botao_criar_filtro').href = `filtros_criacao.html?tipo=${obterPainelAtual()}`;
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
        localStorage.setItem(`filtro_atual_${tipoPainel}`, JSON.stringify(normalizarFiltro(novoFiltro, tipoPainel)));
        window.history.replaceState({}, '', `dashboard.html?painel=${tipoPainel}`);
    } catch (erro) {
        console.log('Não foi possível receber o novo filtro.', erro);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    definirTipoUsuario();
    const parametrosUrl = new URLSearchParams(window.location.search);
    receberNovoFiltroDaUrl(parametrosUrl);
    const painelInicial = parametrosUrl.get('painel') || sessionStorage.PAINEL_DASHBOARD || 'destinos';
    selecionarPainel(painelInicial);
    configurarEventos();

    if (window.google) {
        google.charts.load('current', { packages: ['geochart'], language: 'pt-BR' });
        google.charts.setOnLoadCallback(desenharMapa);
    }
});
