const parametrosUrl = new URLSearchParams(window.location.search);
const tipoFiltro = parametrosUrl.get('tipo') || 'destinos';
const idFiltroEmEdicao = parametrosUrl.get('editar');

function obterChaveFiltro() {
    return tipoFiltro === 'companhias' ? 'filtros_companhias' : 'filtros_destinos';
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
    document.getElementById('estado_filtro').value = filtro.estado || 'TODOS';
    document.getElementById('companhia_filtro').value = filtro.companhia || 'TODAS';
    document.getElementById('problema_filtro').value = filtro.problema || 'TODOS';
    document.getElementById('data_inicial_filtro').value = filtro.dataInicial || '';
    document.getElementById('data_final_filtro').value = filtro.dataFinal || '';
    document.querySelector('.botao_salvar_filtro').textContent = 'Salvar alterações';
}

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

    const novoFiltro = {
        id: idFiltroEmEdicao || Date.now(),
        nome: document.getElementById('nome_filtro').value,
        tipo: tipoFiltro,
        estado: seletorEstado.value,
        nomeEstado: seletorEstado.options[seletorEstado.selectedIndex].text,
        companhia: tipoFiltro === 'companhias' ? seletorCompanhia.value : 'TODAS',
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
