const parametrosUrl = new URLSearchParams(window.location.search);
const tipoFiltro = parametrosUrl.get('tipo') || 'destinos';
const idFiltroEmEdicao = parametrosUrl.get('editar');
let estadosSelecionados = [];
let companhiasSelecionadas = [];

function obterChaveFiltro() {
    return tipoFiltro === 'companhias' ? 'filtros_companhias' : 'filtros_destinos';
}

function obterListaLegada(valor, todos) {
    if (!valor || valor === todos) {
        return [];
    }

    return Array.isArray(valor) ? valor : [valor];
}

function definirOpcaoDisponivel(seletor, todos, selecionados) {
    const opcaoDisponivel = Array.from(seletor.options).find(function (opcao) {
        return opcao.value !== todos && !selecionados.includes(opcao.value);
    });
    seletor.value = opcaoDisponivel
        ? opcaoDisponivel.value
        : (selecionados.length ? selecionados[0] : todos);
}

function renderizarItensComparacao(containerId, selecionados, seletorId, todos, nomeTodos) {
    const container = document.getElementById(containerId);
    const seletor = document.getElementById(seletorId);
    container.replaceChildren();

    if (selecionados.length === 0) {
        const todosSelecionados = document.createElement('span');
        todosSelecionados.className = 'item_comparacao todos_comparacao';
        todosSelecionados.textContent = nomeTodos;
        container.appendChild(todosSelecionados);
        seletor.value = todos;
        return;
    }

    selecionados.forEach(function (valor) {
        const opcao = Array.from(seletor.options).find(function (item) {
            return item.value === valor;
        });
        if (!opcao) {
            return;
        }

        const item = document.createElement('span');
        const nome = document.createElement('span');
        const remover = document.createElement('button');
        item.className = 'item_comparacao';
        nome.textContent = opcao.textContent;
        remover.type = 'button';
        remover.className = 'remover_item_comparacao';
        remover.textContent = '×';
        remover.setAttribute('aria-label', `Remover ${opcao.textContent}`);
        remover.addEventListener('click', function () {
            const indice = selecionados.indexOf(valor);
            if (indice >= 0) {
                selecionados.splice(indice, 1);
            }
            definirOpcaoDisponivel(seletor, todos, selecionados);
            renderizarItensComparacao(containerId, selecionados, seletorId, todos, nomeTodos);
        });
        item.appendChild(nome);
        item.appendChild(remover);
        container.appendChild(item);
    });

    definirOpcaoDisponivel(seletor, todos, selecionados);
}

function adicionarItemComparacao(seletorId, selecionados, todos, containerId, nomeTodos) {
    const seletor = document.getElementById(seletorId);
    const valor = seletor.value;

    if (valor === todos) {
        selecionados.splice(0, selecionados.length);
    } else if (!selecionados.includes(valor)) {
        selecionados.push(valor);
    }

    definirOpcaoDisponivel(seletor, todos, selecionados);
    renderizarItensComparacao(containerId, selecionados, seletorId, todos, nomeTodos);
}

function configurarTipoFiltro() {
    const filtroDeCompanhia = tipoFiltro === 'companhias';
    const titulo = document.getElementById('titulo_criacao_filtro');
    const campoCompanhia = document.getElementById('campo_companhia_filtro');
    const campoProblema = document.getElementById('campo_problema_filtro');

    titulo.textContent = idFiltroEmEdicao
        ? 'Editar filtro'
        : (filtroDeCompanhia ? 'Filtro de companhias' : 'Filtro de destinos');
    campoCompanhia.hidden = !filtroDeCompanhia;
    campoProblema.hidden = !filtroDeCompanhia;
    document.querySelector('.link_voltar_dashboard').href = `dashboard.html?painel=${tipoFiltro}`;

    if (!idFiltroEmEdicao) {
        renderizarItensComparacao('estados_selecionados', estadosSelecionados, 'estado_filtro', 'TODOS', 'Todos os estados');
        renderizarItensComparacao('companhias_selecionadas', companhiasSelecionadas, 'companhia_filtro', 'TODAS', 'Todas as companhias');
        return;
    }

    const filtrosSalvos = JSON.parse(localStorage.getItem(obterChaveFiltro()) || '[]');
    const filtro = filtrosSalvos.find(function (item) {
        return String(item.id) === idFiltroEmEdicao;
    });

    if (!filtro) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso_erro_filtro';
        aviso.textContent = 'Este filtro não foi encontrado. Volte à dashboard e escolha um filtro salvo.';
        document.getElementById('formulario_filtro').prepend(aviso);
        document.querySelector('.botao_salvar_filtro').disabled = true;
        return;
    }

    document.getElementById('nome_filtro').value = filtro.nome || '';
    estadosSelecionados = obterListaLegada(filtro.estados, 'TODOS');
    if (estadosSelecionados.length === 0) {
        estadosSelecionados = obterListaLegada(filtro.estado, 'TODOS');
    }
    companhiasSelecionadas = obterListaLegada(filtro.companhias, 'TODAS');
    if (companhiasSelecionadas.length === 0) {
        companhiasSelecionadas = obterListaLegada(filtro.companhia, 'TODAS');
    }
    renderizarItensComparacao('estados_selecionados', estadosSelecionados, 'estado_filtro', 'TODOS', 'Todos os estados');
    renderizarItensComparacao('companhias_selecionadas', companhiasSelecionadas, 'companhia_filtro', 'TODAS', 'Todas as companhias');
    document.getElementById('problema_filtro').value = filtro.problema || 'TODOS';
    document.getElementById('data_inicial_filtro').value = filtro.dataInicial || '';
    document.getElementById('data_final_filtro').value = filtro.dataFinal || '';
    document.querySelector('.botao_salvar_filtro').textContent = 'Salvar alterações';
}

document.getElementById('adicionar_estado_filtro').addEventListener('click', function () {
    adicionarItemComparacao('estado_filtro', estadosSelecionados, 'TODOS', 'estados_selecionados', 'Todos os estados');
});

document.getElementById('adicionar_companhia_filtro').addEventListener('click', function () {
    adicionarItemComparacao('companhia_filtro', companhiasSelecionadas, 'TODAS', 'companhias_selecionadas', 'Todas as companhias');
});

document.getElementById('formulario_filtro').addEventListener('submit', function (evento) {
    evento.preventDefault();

    const filtrosSalvos = JSON.parse(localStorage.getItem(obterChaveFiltro()) || '[]');
    const seletorEstado = document.getElementById('estado_filtro');
    const seletorCompanhia = document.getElementById('companhia_filtro');
    const seletorProblema = document.getElementById('problema_filtro');
    const dataInicial = document.getElementById('data_inicial_filtro').value;
    const dataFinal = document.getElementById('data_final_filtro').value;

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
        document.getElementById('data_final_filtro').setCustomValidity('A data final deve ser igual ou posterior à data inicial.');
        document.getElementById('data_final_filtro').reportValidity();
        return;
    }

    document.getElementById('data_final_filtro').setCustomValidity('');

    const nomeEstado = estadosSelecionados.length
        ? Array.from(seletorEstado.options).filter(function (opcao) {
            return estadosSelecionados.includes(opcao.value);
        }).map(function (opcao) {
            return opcao.textContent;
        }).join(', ')
        : 'Todos os estados';
    const novoFiltro = {
        id: idFiltroEmEdicao || Date.now(),
        nome: document.getElementById('nome_filtro').value,
        tipo: tipoFiltro,
        estados: estadosSelecionados.slice(),
        estado: estadosSelecionados.length === 1 ? estadosSelecionados[0] : 'TODOS',
        nomeEstado: nomeEstado,
        companhias: tipoFiltro === 'companhias' ? companhiasSelecionadas.slice() : [],
        companhia: tipoFiltro === 'companhias' && companhiasSelecionadas.length === 1
            ? companhiasSelecionadas[0]
            : 'TODAS',
        problema: tipoFiltro === 'companhias' ? seletorProblema.value : 'TODOS',
        dataInicial: dataInicial,
        dataFinal: dataFinal
    };

    const indiceExistente = filtrosSalvos.findIndex(function (filtro) {
        return String(filtro.id) === String(novoFiltro.id);
    });

    if (indiceExistente >= 0) {
        filtrosSalvos[indiceExistente] = novoFiltro;
    } else {
        filtrosSalvos.push(novoFiltro);
    }

    localStorage.setItem(obterChaveFiltro(), JSON.stringify(filtrosSalvos));
    const filtroParaUrl = encodeURIComponent(JSON.stringify(novoFiltro));
    window.location.href = `dashboard.html?painel=${tipoFiltro}&novoFiltro=${filtroParaUrl}`;
});

document.getElementById('data_final_filtro').addEventListener('input', function () {
    this.setCustomValidity('');
});

configurarTipoFiltro();
