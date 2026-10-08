CREATE DATABASE IF NOT EXISTS aircodeTeste;
USE aircodeTeste;

CREATE TABLE empresa (
    id_empresa INT PRIMARY KEY AUTO_INCREMENT,
    razao_social VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    setor_atuacao VARCHAR(50) NOT NULL DEFAULT 'NAO INFORMADO',
    status_aprovacao VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status_aprovacao IN ('PENDENTE', 'APROVADO', 'RECUSADO'))
);


-- CRUD 1: Usuários com Permissões e Preferências
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    cargo VARCHAR(50) NULL,
    nivel_acesso VARCHAR(20) NOT NULL DEFAULT 'FUNCIONARIO' CHECK (nivel_acesso IN ('ADMIN_MASTER', 'GERENTE', 'FUNCIONARIO')),
    tema_preferido VARCHAR(10) DEFAULT 'LIGHT' CHECK (tema_preferido IN ('LIGHT', 'DARK')),
    status_usuario BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_usuario_empresa FOREIGN KEY (id_empresa) REFERENCES empresa(id_empresa) ON DELETE CASCADE
);

-- CRUD 3: Alertas e Notificações
CREATE TABLE alerta(
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nome_alerta VARCHAR(100) NOT NULL,
    metrica_alvo VARCHAR(50) NOT NULL, -- indicador ou estatística da aviação/hotelaria que o sistema deve ficar "vigiando".
    valor_limite DECIMAL(10,2) NOT NULL,
    canal_notificacao VARCHAR(20) DEFAULT 'EMAIL',
    status_alerta BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_alerta_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Companhias Aéreas
CREATE TABLE companhia (
    id_companhia INT AUTO_INCREMENT PRIMARY KEY,
    sigla_icao VARCHAR(5) NULL,
    nome_empresa VARCHAR(150) NOT NULL,
    nome_fantasia_consumidor VARCHAR(150) NULL,
    nacionalidade VARCHAR(30) DEFAULT 'BRASILEIRA',
    status_ativa BOOLEAN DEFAULT TRUE
);

CREATE TABLE filtro_dashboard (
    id_filtro INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nome_filtro VARCHAR(100) NOT NULL,
    uf_origem VARCHAR(2) NULL,
    uf_destino VARCHAR(2) NULL,
    id_companhia INT NULL,
    ano_inicio INT NULL,
    ano_fim INT NULL,
    grupo_problema VARCHAR(100) NULL,
    status_filtro BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_filtro_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Aeroportos
CREATE TABLE aeroporto (
    id_aeroporto INT AUTO_INCREMENT PRIMARY KEY,
    sigla_icao_iata VARCHAR(10) NOT NULL UNIQUE,
    nome_aeroporto VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NULL,
    regiao VARCHAR(30) NULL,
    pais VARCHAR(50) NOT NULL DEFAULT 'BRASIL',
    continente VARCHAR(50) NULL
);

-- Rotas Aéreas
CREATE TABLE rota (
    id_rota INT AUTO_INCREMENT PRIMARY KEY,
    id_aeroporto_origem INT NOT NULL,
    id_aeroporto_destino INT NOT NULL,
    natureza VARCHAR(20) NOT NULL CHECK (natureza IN ('DOMÉSTICA', 'INTERNACIONAL')),
    distancia_km DECIMAL(10,2) NULL,
    CONSTRAINT fk_rota_origem FOREIGN KEY (id_aeroporto_origem) REFERENCES aeroporto(id_aeroporto),
    CONSTRAINT fk_rota_destino FOREIGN KEY (id_aeroporto_destino) REFERENCES aeroporto(id_aeroporto)
);

-- Operações de Voos
CREATE TABLE voo_mensal (
    id_voo_mensal INT AUTO_INCREMENT PRIMARY KEY,
    id_companhia INT NOT NULL,
    id_rota INT NOT NULL,
    ano INT NOT NULL,
    mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    grupo_voo VARCHAR(30) NULL,
    passageiros_pagos INT DEFAULT 0,
    passageiros_gratis INT DEFAULT 0,
    assentos_ofertados INT DEFAULT 0,
    decolagens INT DEFAULT 0,
    combustivel_litros DECIMAL(12,2) NULL,
    horas_voadas DECIMAL(8,2) NULL,
    distancia_voada_km DECIMAL(10,2) NULL,
    CONSTRAINT fk_voo_companhia FOREIGN KEY (id_companhia) REFERENCES companhia(id_companhia),
    CONSTRAINT fk_voo_rota FOREIGN KEY (id_rota) REFERENCES rota(id_rota)
);

-- Reclamações e Qualidade
CREATE TABLE reclamacao (
    id_reclamacao INT AUTO_INCREMENT PRIMARY KEY,
    id_companhia INT NOT NULL,
    uf_consumidor VARCHAR(2) NULL,
    cidade_consumidor VARCHAR(100) NULL,
    data_abertura DATE NOT NULL,
    data_finalizacao DATE NULL,
    tempo_resposta_dias INT NULL,
    grupo_problema VARCHAR(100) NOT NULL,
    problema VARCHAR(255) NOT NULL,
    avaliacao_reclamacao VARCHAR(30) CHECK (avaliacao_reclamacao IN ('Resolvida', 'Não Resolvida', 'Não Avaliada')),
    nota_consumidor INT CHECK (nota_consumidor BETWEEN 1 AND 5),
    CONSTRAINT fk_reclamacao_companhia FOREIGN KEY (id_companhia) REFERENCES companhia(id_companhia)
);


