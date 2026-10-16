
let listaEmpresas = [
    {
        id_empresa: 1,
        razao_social: "FlyTour Viagens e Turismo LTDA",
        nome: "Carlos Eduardo Silva",
        email: "carlos.silva@flytour.com.br",
        cnpj: "12.345.678/0001-90",
        setor_atuacao: "AGENCIA",
        cargo: "Diretor Comercial",
        data_cadastro: "16/10/2026"
    },
    {
        id_empresa: 2,
        razao_social: "Grand Hotel Continental",
        nome: "Mariana Souza Ribeiro",
        email: "mariana.ribeiro@grandcontinental.com.br",
        cnpj: "98.765.432/0001-10",
        setor_atuacao: "HOTEL",
        cargo: "Gerente Geral",
        data_cadastro: "15/10/2026"
    },
    {
        id_empresa: 3,
        razao_social: "Destinos Inteligentes Agência",
        nome: "Rafael Albuquerque",
        email: "rafael@destinosinteligentes.com.br",
        cnpj: "45.123.789/0001-55",
        setor_atuacao: "AGENCIA",
        cargo: "Coordenador de Parcerias",
        data_cadastro: "14/10/2026"
    }
];


window.onload = function () {
    buscarCadastros();
};


function buscarCadastros() {
    
    let nomeAdm = sessionStorage.getItem("NOME_USUARIO") || "Administrador";
    let elementoNomeAdm = document.getElementById("strong_nome_adm");
    if (elementoNomeAdm) {
        elementoNomeAdm.textContent = nomeAdm;
    }

    
    renderizarLista(listaEmpresas);
}


function renderizarLista(empresas) {
    let containerLista = document.getElementById("lista-empresas");
    let badgePendentes = document.getElementById("total-pendentes");

    
    badgePendentes.textContent = empresas.length + " pendentes";

    
    containerLista.innerHTML = "";

    
    if (empresas.length === 0) {
        let mensagemVazia = document.createElement("p");
        mensagemVazia.textContent = "Nenhuma solicitação de cadastro pendente no momento.";
        mensagemVazia.style.color = "#64748b";
        mensagemVazia.style.padding = "20px 0";
        containerLista.appendChild(mensagemVazia);
        return;
    }

    
    for (let i = 0; i < empresas.length; i++) {
        let empresa = empresas[i];
        let cardEmpresa = criarCardEmpresa(empresa);
        containerLista.appendChild(cardEmpresa);
    }
}


function criarCardEmpresa(empresa) {
    let details = document.createElement("details");

    
    let summary = document.createElement("summary");

    
    let avatar = document.createElement("div");
    avatar.className = "avatar";
    let textoBase = empresa.razao_social || empresa.nome || "AC";
    avatar.textContent = textoBase.substring(0, 2).toUpperCase();

    
    let info = document.createElement("div");
    info.className = "info";

    let strong = document.createElement("strong");
    strong.textContent = empresa.razao_social || empresa.nome;

    let spanEmail = document.createElement("span");
    spanEmail.textContent = empresa.email || "Sem e-mail";

    info.appendChild(strong);
    info.appendChild(spanEmail);

    
    let spanStatus = document.createElement("span");
    spanStatus.className = "horario";
    spanStatus.textContent = "Pendente";

    
    let spanSeta = document.createElement("span");
    spanSeta.className = "seta";
    spanSeta.textContent = "▼";

    summary.appendChild(avatar);
    summary.appendChild(info);
    summary.appendChild(spanStatus);
    summary.appendChild(spanSeta);

    
    let corpo = document.createElement("div");
    corpo.className = "corpo";

    let dados = document.createElement("div");
    dados.className = "dados";

    
    let tipoEmpresa = "Não informado";
    if (empresa.setor_atuacao) {
        if (empresa.setor_atuacao.toUpperCase() === "AGENCIA") {
            tipoEmpresa = "Agência";
        } else if (empresa.setor_atuacao.toUpperCase() === "HOTEL") {
            tipoEmpresa = "Hotel";
        } else {
            tipoEmpresa = empresa.setor_atuacao;
        }
    }

    
    dados.appendChild(criarCampo("Razão Social", empresa.razao_social));
    dados.appendChild(criarCampo("Nome do Responsável", empresa.nome));
    dados.appendChild(criarCampo("E-mail", empresa.email));
    dados.appendChild(criarCampo("CNPJ", empresa.cnpj));
    dados.appendChild(criarCampo("Tipo de Empresa", tipoEmpresa));
    dados.appendChild(criarCampo("Cargo do Responsável", empresa.cargo));
    dados.appendChild(criarCampo("Data de Cadastro", empresa.data_cadastro));

    
    let divBotoes = document.createElement("div");
    divBotoes.className = "buttons";

    let botaoAprovar = document.createElement("button");
    botaoAprovar.className = "accept";
    botaoAprovar.innerHTML = '<i class="bi bi-check-lg"></i> Aprovar';
    botaoAprovar.onclick = function () {
        aprovarEmpresa(empresa.id_empresa);
    };

    let botaoRejeitar = document.createElement("button");
    botaoRejeitar.className = "reject";
    botaoRejeitar.innerHTML = '<i class="bi bi-ban"></i> Rejeitar';
    botaoRejeitar.onclick = function () {
        rejeitarEmpresa(empresa.id_empresa);
    };

    divBotoes.appendChild(botaoAprovar);
    divBotoes.appendChild(botaoRejeitar);

    corpo.appendChild(dados);
    corpo.appendChild(divBotoes);

    details.appendChild(summary);
    details.appendChild(corpo);

    return details;
}


function criarCampo(rotulo, valor) {
    let divCampo = document.createElement("div");
    divCampo.className = "campo";

    let label = document.createElement("label");
    label.textContent = rotulo;

    let span = document.createElement("span");
    span.textContent = valor || "Não informado";

    divCampo.appendChild(label);
    divCampo.appendChild(span);

    return divCampo;
}


function aprovarEmpresa(idEmpresa) {
    
    alert("Empresa (ID " + idEmpresa + ") aprovada!\n\n(Aviso: rota de backend ainda não implementada. O item foi removido da lista para demonstração.)");

    
    listaEmpresas = listaEmpresas.filter(function (item) {
        return item.id_empresa !== idEmpresa;
    });

    renderizarLista(listaEmpresas);
}

function rejeitarEmpresa(idEmpresa) {
   

    alert("Empresa (ID " + idEmpresa + ") rejeitada!\n\n(Aviso: rota de backend ainda não implementada. O item foi removido da lista para demonstração.)");

    
    listaEmpresas = listaEmpresas.filter(function (item) {
        return item.id_empresa !== idEmpresa;
    });

    renderizarLista(listaEmpresas);
}
