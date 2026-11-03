# Library Manager

Sistema web de gerenciamento de biblioteca, desenvolvido como trabalho prático da disciplina de
Teste de Software.

## Integrantes

- Erick Soares de Souza

## Sobre o sistema

O Library Manager permite gerenciar o acervo e os empréstimos de uma biblioteca:

- **Livros:** cadastro com título, autor, ISBN e quantidade de exemplares, com controle dos
  exemplares disponíveis.
- **Membros:** cadastro de leitores com nome e e-mail.
- **Empréstimos:** empréstimo de um livro a um membro com data de devolução prevista, além do
  registro da devolução.

## Tecnologias

- **Java 25:** linguagem principal.
- **Spring Boot:** framework web para a API REST, a validação de dados e a integração com o banco.
- **MongoDB:** banco de dados NoSQL que armazena livros, membros e empréstimos.
- **React + TypeScript:** interface web, em `frontend/`.
- **Vite:** servidor de desenvolvimento e build do front-end, servido pelo próprio Spring Boot.
- **Motion:** animações da interface.
- **Material Symbols (Google):** ícones da interface, no estilo Rounded (licença Apache 2.0).
- **Gradle (Kotlin DSL):** build e gerenciamento de dependências.
- **JUnit 5:** testes de unidade.
- **JaCoCo:** medição da cobertura de testes.
- **GitHub Actions:** integração contínua, com testes rodando em Linux, macOS e Windows a cada
  commit.
- **Codecov:** publicação dos relatórios de cobertura.

## Uso de IA

- **Claude Code (Anthropic):** assistente de programação usado no terminal para estruturar o
  projeto, auxiliar na escrita do código e da documentação. Todo o código gerado foi revisado pelo
  autor.
- **Skills do Claude Code** (`.claude/skills/`): instruções que orientam o assistente neste projeto.
  - `tests`: convenções e boas práticas de teste, baseadas no curso de Teste de Software do Prof.
    André Hora (DCC/UFMG).
  - `commit`: padrão de mensagens e fluxo de commits do projeto.
  - `apple-design`: princípios de interface e animação da Apple para a web, de
    [Emil Kowalski](https://github.com/emilkowalski/skills) (licença MIT).

## Execução da aplicação

Pré-requisitos: JDK 25 e Docker. O Gradle baixa o Node.js e compila o front-end automaticamente.

```bash
# Sobe o MongoDB local (container em segundo plano, porta 27017)
docker compose up -d

# Executa a aplicação
./gradlew bootRun
```

Para usar outro MongoDB, defina a variável `MONGODB_URI` (padrão:
`mongodb://localhost:27017/library`).

A aplicação fica em `http://localhost:8080`.

Para desenvolver o front-end com recarga automática, deixe o `bootRun` rodando e, em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O Vite abre em `http://localhost:5173` e repassa as chamadas `/api` para o Spring Boot.

## Execução dos testes

Pré-requisito: JDK 25 instalado. O Gradle Wrapper baixa o Gradle automaticamente.

```bash
# Executar os testes
./gradlew test

# Executar os testes e gerar o relatório de cobertura
./gradlew test jacocoTestReport
```

No Windows, use `gradlew.bat` no lugar de `./gradlew`.

O relatório de cobertura fica em `build/reports/jacoco/test/html/index.html`.
