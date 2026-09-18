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
- Backend: Node.js (>= 22.5) e Express
- Banco de dados: SQLite (via o módulo nativo `node:sqlite`, sem dependências compiladas)

## Autenticação

A partir da V1.0.1, o acesso ao sistema exige login (perfil único:
Administrador). Configure estas variáveis de ambiente (veja `.env.example`)
antes do primeiro boot:

- `SESSION_SECRET` — segredo para assinar o cookie de sessão.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — usadas **somente** no
  primeiro boot para criar o administrador inicial (só a senha em hash é
  gravada no banco). Depois que o administrador existe, essas variáveis
  não têm mais efeito.

## Como executar

```bash
npm install
cp .env.example .env   # preencha SESSION_SECRET, ADMIN_EMAIL e ADMIN_PASSWORD
npm start
```

O aplicativo ficará disponível em `http://localhost:3000/login.html`.

## Estrutura do projeto

```
db/          schema e conexão com o banco SQLite
routes/      rotas da API (produtos, vendas, compras, alertas)
public/      frontend (HTML, CSS e JavaScript)
server.js    ponto de entrada da aplicação Express
```

## Deploy no Render

O repositório já inclui um `render.yaml`, então o Render detecta a
configuração automaticamente:

1. Crie uma conta em [render.com](https://render.com) (dá pra entrar direto
   com o GitHub).
2. Clique em **New +** → **Blueprint** e selecione este repositório.
3. Confirme a criação do serviço `smartestoque` (plano Free).
4. Aguarde o build/deploy terminar; o Render mostra a URL pública
   (algo como `https://smartestoque.onrender.com`).

**Importante:** no plano gratuito do Render o serviço "dorme" após alguns
minutos sem uso e o disco não é persistente entre reinicializações — ou
seja, o banco SQLite pode resetar de tempos em tempos. Para uso contínuo de
verdade (não apenas para a demonstração do trabalho), o ideal é contratar um
disco persistente no Render ou trocar o SQLite por um banco hospedado.
