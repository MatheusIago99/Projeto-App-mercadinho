# SmartEstoque

Aplicativo web para gerenciamento de estoque e vendas, desenvolvido para as
Atividades Extensionistas do curso de Análise e Desenvolvimento de Sistemas
(UNINTER). Aplicado no **Mini Mercado Bom Gosto**, em Caxias do Sul/RS.

## Funcionalidades

- Cadastro, edição e exclusão de produtos
- Registro de vendas com baixa automática no estoque
- Registro de compras/reposição de estoque
- Alertas de estoque mínimo e de produtos vencidos ou próximos da validade

## Tecnologias

- Frontend: HTML5, CSS e JavaScript
- Backend: Node.js e Express
- Banco de dados: SQLite (via `better-sqlite3`)

## Como executar

```bash
npm install
npm start
```

O aplicativo ficará disponível em `http://localhost:3000`.

## Estrutura do projeto

```
db/          schema e conexão com o banco SQLite
routes/      rotas da API (produtos, vendas, compras, alertas)
public/      frontend (HTML, CSS e JavaScript)
server.js    ponto de entrada da aplicação Express
```
