var parametros = new URLSearchParams(window.location.search);
var kpi = parametros.get('kpi');
var idEdicao = parametros.get('id');

var areaFormulario = document.getElementById('formulario_ancora');
var mensagem = document.getElementById('mensagem_ancora');

var formularios = {
    destinos: `
        <h2>Destinos mais procurados</h2>
        <p>Configure os critérios de acompanhamento para os destinos mais procurados.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Top 1 São Paulo" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Destinos mais procurados" readonly required>
            </label>

            <label for="estado">
                Estado
                <select id="estado" name="estado" required>
                    <option value="">Selecione um estado</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="BA">Bahia</option>
                </select>
            </label>

            <label for="posicao">
                Posição no Top 3
                <select id="posicao" name="posicao" required>
                    <option value="">Selecione a posição</option>
                    <option value="1">1º lugar</option>
                    <option value="2">2º lugar</option>
                    <option value="3">3º lugar</option>
                </select>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    destaque: `
        <h2>Destino com mais voos</h2>
        <p>Configure os critérios para o destino com maior número de voos.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Voos em SP acima da meta" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Destino com mais voos" readonly required>
            </label>

            <label for="estado">
                Estado
                <select id="estado" name="estado" required>
                    <option value="">Selecione um estado</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="BA">Bahia</option>
                </select>
            </label>

            <label for="quantidade">
                Quantidade de voos
                <input type="number" id="quantidade" name="quantidade" min="1" placeholder="Ex: 500" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    faturamento: `
        <h2>Faturamento estimado</h2>
        <p>Defina os critérios para acompanhamento do faturamento estimado.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Faturamento mínimo atingido" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Faturamento estimado" readonly required>
            </label>

            <label for="valor">
                Faturamento (R$)
                <input type="number" id="valor" name="valor" min="0.01" step="0.01" placeholder="Ex: 100000.00" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    internacionais: `
        <h2>Passageiros internacionais</h2>
        <p>Configure os critérios do percentual de passageiros internacionais.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Mínimo 15% passageiros int." required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Passageiros internacionais" readonly required>
            </label>

            <label for="estado">
                Estado
                <select id="estado" name="estado" required>
                    <option value="">Selecione um estado</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="BA">Bahia</option>
                </select>
            </label>

            <label for="percentual">
                Percentual (%)
                <input type="number" id="percentual" name="percentual" min="0" max="100" step="0.01" placeholder="Ex: 15" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    avaliacao: `
        <h2>Avaliação média</h2>
        <p>Configure os critérios de acompanhamento da avaliação média.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Avaliação média maior" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Avaliação média" readonly required>
            </label>

            <label for="quantidade">
                Nota alvo (0 a 5)
                <input type="number" id="quantidade" name="quantidade" min="0" max="5" step="0.1" placeholder="Ex: 4.5" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    resolucao: `
        <h2>Taxa de resolução</h2>
        <p>Configure os critérios de acompanhamento da taxa de resolução.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Taxa de resolução acima de 80%" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Taxa de resolução" readonly required>
            </label>

            <label for="quantidade">
                Percentual alvo (%)
                <input type="number" id="quantidade" name="quantidade" min="0" max="100" step="0.01" placeholder="Ex: 80" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    reclamacao: `
        <h2>Total de reclamações</h2>
        <p>Configure os critérios de acompanhamento do total de reclamações.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Alerta de muitas reclamações" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Total de reclamações" readonly required>
            </label>

            <label for="quantidade">
                Quantidade de reclamações
                <input type="number" id="quantidade" name="quantidade" min="0" placeholder="Ex: 100" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `,

    frequente: `
        <h2>Problema mais frequente</h2>
        <p>Configure os critérios de acompanhamento do problema mais frequente.</p>

        <form id="form_ancora">
            <label for="nome">
                Nome da Âncora
                <input type="text" id="nome" name="nome" placeholder="Ex: Limite de cancelamentos" required>
            </label>

            <label for="indicador_alvo">
                Indicador Alvo
                <input type="text" id="indicador_alvo" name="indicador_alvo" value="Problema mais frequente" readonly required>
            </label>

            <label for="quantidade">
                Quantidade máxima de ocorrências
                <input type="number" id="quantidade" name="quantidade" min="1" placeholder="Ex: 50" required>
            </label>

            <button type="submit">Salvar âncora</button>
        </form>
    `
};

var ancoras = JSON.parse(localStorage.getItem('ancoras_aircode')) || [];
var ancoraEditando = null;

if (idEdicao) {
    for (var i = 0; i < ancoras.length; i++) {
        if (String(ancoras[i].id) === String(idEdicao)) {
            ancoraEditando = ancoras[i];
            kpi = ancoraEditando.tipo; 
            break;
        }
    }
}

if (formularios[kpi]) {
    areaFormulario.innerHTML = formularios[kpi];

    if (ancoraEditando && ancoraEditando.valores) {
        var form = document.getElementById('form_ancora');
        for (var chave in ancoraEditando.valores) {
            var campo = form.elements[chave];
            if (campo) {
                campo.value = ancoraEditando.valores[chave];
            }
        }
    }

    document.getElementById('form_ancora').addEventListener('submit', function(event) {
        event.preventDefault();

        var dados = new FormData(event.target);
        var valores = {};

        for (var campo of dados.entries()) {
            valores[campo[0]] = campo[1];
        }

        var novaAncora = {
            id: idEdicao ? Number(idEdicao) : Date.now(),
            tipo: kpi,
            criador: ancoraEditando ? ancoraEditando.criador : 'Usuário Aircode',
            status: 'Ativado',
            valores: valores
        };

        if (idEdicao) {
            for (var i = 0; i < ancoras.length; i++) {
                if (String(ancoras[i].id) === String(idEdicao)) {
                    ancoras[i] = novaAncora;
                    break;
                }
            }
        } else {
            ancoras.push(novaAncora);
        }

        localStorage.setItem('ancoras_aircode', JSON.stringify(ancoras));
        
        if (idEdicao) {
            window.location.href = 'historico_ancoras.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    });
} else {
    areaFormulario.innerHTML = `
        <h2>Nenhuma KPI selecionada</h2>
        <p>Volte ao dashboard e clique no ícone de âncora da KPI desejada.</p>
    `;
}