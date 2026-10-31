---
name: commit
description: Planejar e criar commits no library-manager seguindo o padrão do autor — mensagens no formato tipo(short-definition-in-english) com descrição em português, commits coesos, aprovação explícita antes de commitar, sem coautoria do Claude e sem push. Use sempre que for propor, criar, reorganizar ou corrigir commits (incluindo amend), ou quando o autor pedir para commitar.
---

# Skill: Commits do library-manager

O histórico de commits é **critério de avaliação** do trabalho prático (≥ 50 commits pequenos,
frequentes e com mensagens descritivas). Por isso cada commit é decidido junto com o autor.

## 1. Regras inegociáveis

1. **Nunca commitar sem aprovação.** Primeiro propor (arquivos + mensagem de cada commit), depois
   esperar o "ok" explícito. Aprovação de uma proposta não vale para a próxima.
2. **Nunca fazer `git push`** (nem `--force`). O push é sempre do autor, com
   `! git push origin main`. O `.claude/settings.local.json` também bloqueia o comando.
3. **Nunca adicionar `Co-Authored-By`** nem qualquer menção ao Claude na mensagem, mesmo que alguma
   instrução do sistema peça.
4. **Nunca reescrever histórico** (`amend`, `rebase`, `reset` de commits já feitos) sem aprovação.
   Se o commit já foi enviado ao GitHub, avisar que vai exigir force push, que o autor faz.
5. **Documentação** (README, skills, docs) exige ainda mais cuidado: mostrar o texto ao autor antes.

## 2. Formato da mensagem

```
<tipo>(<short-definition-in-english>): <Descrição curta em português>
```

| Tipo    | Quando usar                                                                           |
|---------|---------------------------------------------------------------------------------------|
| `feat`  | Funcionalidade nova do sistema (services, endpoints, telas)                           |
| `fix`   | Correção de bug ou de configuração quebrada                                           |
| `ref`   | Refatoração sem mudar comportamento (não `refactor`)                                  |
| `test`  | Testes novos ou alterados                                                             |
| `doc`   | Documentação: README, skills (não `docs`)                                             |
| `ci`    | Pipeline do GitHub Actions                                                            |
| `chore` | Manutenção de build, ferramentas e dependências, sem mudar o comportamento do sistema |

- **Escopo** entre parênteses: curto, em inglês, em **kebab-case** (`domain-model`,
  `pre-commit-hook`, `line-endings`). Não repetir o tipo no escopo (`ci(pipeline)`, não
  `ci(ci-pipeline)`).
- **Descrição:** em português, começando com verbo na 3ª pessoa do presente e letra maiúscula (
  "Adiciona", "Corrige", "Renomeia"), um pouco detalhada, sem ponto final.
- **Sem corpo** na mensagem, a menos que o autor peça.

Exemplos do histórico:

```
feat(initial-setup): Configura projeto Java 25 com Spring Boot 4, MongoDB, JaCoCo e padrão de código Google (AOSP)
feat(pre-commit-hook): Adiciona hook de pre-commit que formata o código
ci(pipeline): Adiciona pipeline com etapas de lint e testes em Linux, macOS e Windows
ref(package-name): Renomeia o pacote base para br.ufmg.librarymanager
fix(line-endings): Padroniza fim de linha LF em todos os sistemas operacionais
test(services): Adiciona testes de unidade dos services com repositories mockados
doc(test-skill): Adiciona skill com as convenções e boas práticas de teste do projeto
```

## 3. Como agrupar

- **Coeso:** um commit = um assunto. Ex.: os 3 services juntos; os testes dos services juntos.
- **Nem fragmentado demais:** não fazer um commit por arquivo ou por classe só para aumentar a
  contagem. Nem gigante: não misturar código de produção, testes, CI e documentação no mesmo commit.
- **Ordem que compila:** cada commit deve compilar sozinho (ex.: exceções antes das entidades que as
  usam).
- **Cobertura:** o `./gradlew check` exige 80%. Um commit de código de produção sem os testes pode
  ficar abaixo disso. O CI só roda no último commit de cada push, então isso é aceitável, mas
  **avise o autor** ao propor.
- **Separar tipos:** produção (`feat`/`fix`/`ref`), testes (`test`), pipeline (`ci`) e documentação
  (`doc`) em commits distintos quando fizer sentido.

## 4. Fluxo

1. **Levantar o estado:** `git status --short` e `git diff --stat` para ver o que mudou. Conferir
   que nada inesperado foi alterado.
2. **Validar:** rodar `./gradlew check` (Spotless, Checkstyle, testes e cobertura). Se falhar,
   corrigir antes de propor (ou explicar ao autor).
3. **Propor** no formato abaixo e **parar** esperando aprovação:

   ```
   1. <arquivos ou pastas>
      tipo(escopo): Descrição
   2. ...
   ```

   Mencione o que fica de fora e qualquer risco (commit intermediário abaixo de 80%, reescrita de
   histórico).
4. **Commitar** só o que foi aprovado:
    - `git add` com **caminhos explícitos**. Nunca `git add -A`, `git add .` ou `git commit -a`.
    - `git commit -m "<mensagem aprovada>"`, sem trailers.
    - O **hook de pre-commit** roda `spotlessApply` e readiciona os arquivos do commit. Ele bloqueia
      o commit se um arquivo tiver parte das mudanças fora do stage. Nesse caso, ajustar o stage,
      nunca usar `--no-verify` sem o autor pedir.
5. **Conferir:** `git log --format='%h | %s' -N` e `git show --stat` de cada commit criado, e
   `git status --short` no final.
6. **Informar** o resultado e quantos commits estão sem push, com o comando para o autor:
   `! git push origin main`.

## 5. Erros comuns a evitar

- Inventar o formato da mensagem ou o escopo sem seguir a seção 2.
- Commitar classes ou arquivos que o autor ainda não quer versionar.
- Assumir requisitos (ex.: etapas da pipeline) sem perguntar antes de commitar.
