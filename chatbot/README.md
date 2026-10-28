# Chatbot da Aircode

O chatbot responde perguntas sobre os números que aparecem na dashboard. Ele é um servidor em Python (FastAPI) que usa o Gemini. O front manda para ele o que está na tela e ele responde em cima disso. Ele não acessa o banco.

## O que precisa ter instalado

- Node.js e o projeto principal funcionando
- Python 3.14 ou 3.13
- Uma chave do Gemini (é de graça)

No Windows, ao instalar o Python, marque **Add python.exe to PATH**

## Pegar a chave do Gemini

1. Entre em https://aistudio.google.com com sua conta Google
2. Clique em **Get API key** e depois em **Create API key**
3. Se pedir um projeto, escolha **Create API key in new project**
4. Copie a chave

Cada um cria a sua
Não  não suba a chave no Git

## Configuração do env

Crie o arquivo `chatbot/.env`:

```
GEMINI_API_KEY=sua_chave_aqui
MODELO=gemini-3.5-flash-lite
```

Sem aspas e sem espaços. Esse arquivo não vai para o GitHub.

## Instalar e rodar o chatbot

```
cd chatbot
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

No Mac ou Linux, troque o `activate` por `source venv/bin/activate`.
Se o Windows não achar o `python`, use `py`.


## Rodar o projeto inteiro

São dois terminais abertos ao mesmo tempo.

Terminal 1, na raiz do projeto:

```
npm start
```

Terminal 2, na pasta `chatbot`, com o `venv` ativado:

```
uvicorn main:app --reload --port 8000
```


## Problemas comuns

| O que acontece | O que fazer |
|---|---|
| `python` não é reconhecido | Reinstale marcando "Add python.exe to PATH" ou use `py` |
| O PowerShell bloqueia o `activate` | Use o Prompt de Comando (cmd) |
| "Não consegui responder agora" | O servidor Python está desligado ou em outra porta |
| Erro 404 de modelo | Troque o `MODELO` no `.env` por um nome que apareça no AI Studio |
| Erro de chave inválida | Confira o `.env` e rode o `uvicorn` de dentro da pasta `chatbot` |
| Erro 429 ou 503 | Limite de uso ou Gemini lotado. Espere uns minutos |