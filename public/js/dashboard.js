const dadosDashboard = {
    destinos: {
        estados: ['SP', 'RJ', 'AL'],
        origens: [450, 330, 560],
        destinos: [680, 330, 830],
        viajantes: [5, 15, 45, 35]
    },
    companhias: {
        nomes: ['LATAM', 'GOL', 'Azul'],
        assentos: [22, 30, 21],
        resolvidos: [57, 58, 70],
        naoResolvidos: [43, 42, 30]
    }
};

const graficos = {};
const cores = {
    azul: '#1B39D6',
    marinho: '#0C1B4D',
    amarelo: '#F5C518',
    cinza: '#76809c'
};

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
                        color: cores.marinho
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#dfe2eb'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            ...opcoes
        }
    });
}

function obterFiltroAtual(tipoPainel) {
    return JSON.parse(localStorage.getItem(`filtro_atual_${tipoPainel}`) || 'null');
}

function renderizarGraficos() {
    if (typeof Chart === 'undefined') {
        document.querySelectorAll('canvas').forEach(function (canvas) {
            canvas.replaceWith('Não foi possível carregar o gráfico agora.');
        });
        return;
    }

    const destinos = dadosDashboard.destinos;
    const filtroDestinos = obterFiltroAtual('destinos');
    let estadosDestino = destinos.estados;
    let valoresOrigem = destinos.origens;
    let valoresDestino = destinos.destinos;

    if (filtroDestinos && filtroDestinos.estado !== 'TODOS') {
        const estadoFiltrado = estadosBrasil.find(function (estado) {
            return estado[0] === `BR-${filtroDestinos.estado}`;
        });

        if (estadoFiltrado) {
            estadosDestino = [filtroDestinos.estado];
            valoresOrigem = [Math.round(estadoFiltrado[2] * 0.65)];
            valoresDestino = [estadoFiltrado[2]];
        }
    }

    criarGrafico('grafico_origem_destino', 'bar', {
        labels: estadosDestino,
        datasets: [
            { label: 'Origem', data: valoresOrigem, backgroundColor: cores.cinza },
            { label: 'Destino', data: valoresDestino, backgroundColor: cores.marinho }
        ]
    });

    criarGrafico('grafico_origem_bahia', 'doughnut', {
        labels: ['Outros', 'Minas Gerais', 'São Paulo', 'Rio de Janeiro'],
        datasets: [
            { data: destinos.viajantes, backgroundColor: ['#555e79', cores.marinho, cores.azul, '#b9bfd0'] }
        ]
    }, {
        scales: {
            y: { display: false },
            x: { display: false }
        }
    });

    const companhias = dadosDashboard.companhias;
    const filtroCompanhias = obterFiltroAtual('companhias');
    let nomesCompanhias = companhias.nomes;
    let valoresAssentos = companhias.assentos;
    let valoresResolvidos = companhias.resolvidos;
    let valoresNaoResolvidos = companhias.naoResolvidos;

    if (filtroCompanhias && filtroCompanhias.companhia !== 'TODAS') {
        const indiceCompanhia = companhias.nomes.indexOf(filtroCompanhias.companhia);

        if (indiceCompanhia >= 0) {
            nomesCompanhias = [companhias.nomes[indiceCompanhia]];
            valoresAssentos = [companhias.assentos[indiceCompanhia]];
            valoresResolvidos = [companhias.resolvidos[indiceCompanhia]];
            valoresNaoResolvidos = [companhias.naoResolvidos[indiceCompanhia]];
        }
    }

    const problemas = {
        'Cancelamento': 55,
        'Atraso': 25,
        'Extravio de bagagem': 15,
        'TODOS': 5
    };
    let nomesProblemas = ['Cancelamento', 'Atraso', 'Extravio de bagagem', 'Outros'];
    let valoresProblemas = [55, 25, 15, 5];

    if (filtroCompanhias && filtroCompanhias.problema !== 'TODOS') {
        nomesProblemas = [filtroCompanhias.problema, 'Outros problemas'];
        valoresProblemas = [problemas[filtroCompanhias.problema] || 20, 100 - (problemas[filtroCompanhias.problema] || 20)];
    }

    criarGrafico('grafico_problemas', 'pie', {
        labels: nomesProblemas,
        datasets: [
            { data: valoresProblemas, backgroundColor: [cores.marinho, '#7d86a3', cores.azul, cores.amarelo] }
        ]
    }, {
        scales: {
            y: { display: false },
            x: { display: false }
        }
    });

    criarGrafico('grafico_assentos', 'bar', {
        labels: nomesCompanhias,
        datasets: [
            { label: 'Assentos ocupados', data: valoresAssentos, backgroundColor: cores.marinho }
        ]
    }, { indexAxis: 'y' });

    criarGrafico('grafico_resolucao', 'bar', {
        labels: nomesCompanhias,
        datasets: [
            { label: 'Resolvido', data: valoresResolvidos, backgroundColor: cores.azul },
            { label: 'Não resolvido', data: valoresNaoResolvidos, backgroundColor: '#b9bfd0' }
        ]
    }, {
        scales: {
            x: { stacked: true, max: 100 },
            y: { stacked: true }
        }
    });
}

function obterTotalVoos() {
    return estadosBrasil.reduce(function (total, estado) {
        return total + estado[2];
    }, 0);
}

function atualizarResumoMapa(nomeEstado, quantidadeVoos) {
    const porcentagem = ((quantidadeVoos / obterTotalVoos()) * 100).toFixed(1);
    document.getElementById('resumo_mapa').textContent = `${nomeEstado} teve ${quantidadeVoos} voos, representando ${porcentagem}% do Brasil.`;
}

function desenharMapa() {
    if (!window.google || !google.visualization) {
        return;
    }

    const dadosMapa = new google.visualization.DataTable();
    dadosMapa.addColumn('string', 'Estado');
    dadosMapa.addColumn('number', 'Voos');
    dadosMapa.addRows(estadosBrasil.map(function (estado) {
        return [estado[0], estado[2]];
    }));

    const mapa = new google.visualization.GeoChart(document.getElementById('mapa_brasil'));

    google.visualization.events.addListener(mapa, 'ready', function () {
        document.querySelectorAll('#mapa_brasil path[fill="none"]').forEach(function (caminho) {
            caminho.style.display = 'none';
        });
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

    google.visualization.events.addListener(mapa, 'select', function () {
        const selecao = mapa.getSelection();

        if (selecao.length === 0) {
            return;
        }

        const codigoEstado = dadosMapa.getValue(selecao[0].row, 0);
        const estadoSelecionado = estadosBrasil.find(function (estado) {
            return estado[0] === codigoEstado;
        });

        if (estadoSelecionado) {
            atualizarResumoMapa(estadoSelecionado[1], estadoSelecionado[2]);
        }
    });

    const totalVoos = obterTotalVoos();
    const porcentagemPrioritaria = (((980 + 760) / totalVoos) * 100).toFixed(1);
    document.getElementById('resumo_mapa').textContent = `São Paulo e Rio de Janeiro concentram ${porcentagemPrioritaria}% dos voos do Brasil.`;

    const filtroDestinos = obterFiltroAtual('destinos');
    if (filtroDestinos && filtroDestinos.estado !== 'TODOS') {
        const estadoFiltrado = estadosBrasil.find(function (estado) {
            return estado[0] === `BR-${filtroDestinos.estado}`;
        });

        if (estadoFiltrado) {
            atualizarResumoMapa(estadoFiltrado[1], estadoFiltrado[2]);
        }
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
    return filtro;
}

function mostrarFiltroAtivo(tipoPainel) {
    const aviso = document.getElementById('aviso_filtro_ativo');
    const textoAviso = document.getElementById('texto_filtro_ativo');
    const filtro = obterFiltroAtual(tipoPainel);

    if (!filtro) {
        aviso.hidden = true;
        textoAviso.textContent = '';
        return;
    }

    aviso.hidden = false;
    textoAviso.textContent = `Filtro ativo: ${filtro.nome}`;
}

function removerFiltroAtivo(tipoPainel) {
    localStorage.removeItem(`filtro_atual_${tipoPainel}`);
    renderizarGraficos();
    mostrarFiltroAtivo(tipoPainel);

    if (tipoPainel === 'destinos' && window.google && google.visualization) {
        desenharMapa();
    }
}

function aplicarFiltroNaDashboard(filtro, tipoPainel) {
    const filtroNormalizado = normalizarFiltro(filtro, tipoPainel);
    localStorage.setItem(`filtro_atual_${tipoPainel}`, JSON.stringify(filtroNormalizado));
    renderizarGraficos();
    mostrarFiltroAtivo(tipoPainel);

    if (tipoPainel === 'destinos' && filtroNormalizado.estado !== 'TODOS') {
        const estadoSelecionado = estadosBrasil.find(function (estado) {
            return estado[0] === `BR-${filtroNormalizado.estado}`;
        });

        if (estadoSelecionado) {
            atualizarResumoMapa(estadoSelecionado[1], estadoSelecionado[2]);
        }
    }
}

function mostrarFiltrosSalvos() {
    const tipoPainel = obterPainelAtual();
    const listaFiltros = document.getElementById('lista_filtros');
    const filtrosSalvos = JSON.parse(localStorage.getItem(obterChaveFiltros(tipoPainel)) || '[]');

    listaFiltros.innerHTML = '';

    if (filtrosSalvos.length === 0) {
        listaFiltros.innerHTML = '<p class="mensagem_lista">Você ainda não criou nenhum filtro.</p>';
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
        const cartaoFiltro = document.createElement('article');
        cartaoFiltro.className = 'cartao_filtro_salvo';
        cartaoFiltro.innerHTML = `
            <div>
                <h3>${filtro.nome}</h3>
                <p>${obterNomeEstado(filtro.estado)}${textoCompanhia}${textoProblema}</p>
            </div>
            <div class="acoes_filtro_salvo">
                <button class="botao_aplicar_filtro" data-indice="${indice}">Aplicar</button>
                <button class="botao_excluir_filtro" data-indice="${indice}">Excluir</button>
            </div>
        `;
        listaFiltros.appendChild(cartaoFiltro);
    });

    document.querySelectorAll('.botao_aplicar_filtro').forEach(function (botao) {
        botao.addEventListener('click', function () {
            const filtro = filtrosSalvos[botao.dataset.indice];
            aplicarFiltroNaDashboard(filtro, tipoPainel);
            document.getElementById('modal_filtros').hidden = true;
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
        const filtroJaExiste = filtrosSalvos.some(function (filtro) {
            return filtro.id === novoFiltro.id;
        });

        if (!filtroJaExiste) {
            filtrosSalvos.push(novoFiltro);
            localStorage.setItem(chaveFiltros, JSON.stringify(filtrosSalvos));
        }

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
    renderizarGraficos();
    configurarEventos();

    if (window.google) {
        google.charts.load('current', { packages: ['geochart'], language: 'pt-BR' });
        google.charts.setOnLoadCallback(desenharMapa);
    }
});
