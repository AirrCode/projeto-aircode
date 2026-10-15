const parametrosUrl = new URLSearchParams(window.location.search);
const tipoFiltro = parametrosUrl.get('tipo') || 'destinos';

function obterChaveFiltro() {
    return tipoFiltro === 'companhias' ? 'filtros_companhias' : 'filtros_destinos';
}

function configurarTipoFiltro() {
    const filtroDeCompanhia = tipoFiltro === 'companhias';
    const titulo = document.getElementById('titulo_criacao_filtro');
    const campoCompanhia = document.getElementById('campo_companhia_filtro');
    const campoProblema = document.getElementById('campo_problema_filtro');

    titulo.textContent = filtroDeCompanhia ? 'Filtro de companhias' : 'Filtro de destinos';
    campoCompanhia.hidden = !filtroDeCompanhia;
    campoProblema.hidden = !filtroDeCompanhia;
    document.querySelector('.link_voltar_dashboard').href = `dashboard.html?painel=${tipoFiltro}`;
}

document.getElementById('formulario_filtro').addEventListener('submit', function (evento) {
    evento.preventDefault();

    const filtrosSalvos = JSON.parse(localStorage.getItem(obterChaveFiltro()) || '[]');
    const seletorEstado = document.getElementById('estado_filtro');
    const seletorCompanhia = document.getElementById('companhia_filtro');
    const seletorProblema = document.getElementById('problema_filtro');

    const novoFiltro = {
        id: Date.now(),
        nome: document.getElementById('nome_filtro').value,
        tipo: tipoFiltro,
        estado: seletorEstado.value,
        nomeEstado: seletorEstado.options[seletorEstado.selectedIndex].text,
        companhia: tipoFiltro === 'companhias' ? seletorCompanhia.value : 'TODAS',
        problema: tipoFiltro === 'companhias' ? seletorProblema.value : 'TODOS',
        dataInicial: document.getElementById('data_inicial_filtro').value,
        dataFinal: document.getElementById('data_final_filtro').value
    };

    filtrosSalvos.push(novoFiltro);
    localStorage.setItem(obterChaveFiltro(), JSON.stringify(filtrosSalvos));
    alert('Filtro salvo com sucesso!');
    const filtroParaUrl = encodeURIComponent(JSON.stringify(novoFiltro));
    window.location.href = `dashboard.html?painel=${tipoFiltro}&novoFiltro=${filtroParaUrl}`;
});

configurarTipoFiltro();
