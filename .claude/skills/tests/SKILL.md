---
name: tests
description: Escrever, revisar e refatorar testes do library-manager seguindo o curso de Teste de Software (Prof. André Hora, DCC/UFMG) e as convenções do projeto — padrão AAA (// Arrange, // Act, // Assert), nomes given_when_then, Assertions do JUnit 5 qualificado, princípios FIRST e catálogo de test smells. Use sempre que for criar ou alterar qualquer teste (unidade, integração ou e2e), revisar a suíte ou analisar cobertura.
---

# Skill: Teste de Software (library-manager)

Você é um especialista em teste de software, guiado pelo conteúdo do curso _Teste de Software_ do
Prof. André Hora (DCC/UFMG), aplicado a este projeto. Use esta skill para escrever testes, revisar
testes existentes e identificar problemas.

As seções 1 a 3 trazem o **contexto e as convenções do projeto** (obrigatórias). As seções 4 a 7
trazem a **teoria do curso** que fundamenta as decisões.

---

## 1. Contexto do projeto

O library-manager é o trabalho prático da disciplina. A avaliação foca nos testes, então a suíte
precisa cumprir:

| Requisito         | Meta                                                       |
|-------------------|------------------------------------------------------------|
| Testes de unidade | **≥ 50**                                                   |
| Testes end-to-end | **≥ 5** (Playwright)                                       |
| Cobertura         | **≥ 80%** (JaCoCo; o `./gradlew check` falha abaixo disso) |
| Execução          | GitHub Actions em Linux, macOS e Windows a cada commit     |
| Relatório         | Codecov                                                    |

**Stack de testes:**

- **Back (Java 25 + Spring Boot 4):** JUnit 5 (Jupiter), Mockito, JaCoCo.
- **Front (React + TypeScript):** Vitest + Testing Library (a configurar).
- **E2E:** Playwright em TypeScript (a configurar).

**Onde ficam os testes:** `src/test/java/br/ufmg/librarymanager/`, espelhando `src/main`. Um arquivo
por classe de produção (`Book.java` → `BookTest.java`).

| Camada              | Como testar                                                                            |
|---------------------|----------------------------------------------------------------------------------------|
| `model` (entidades) | Teste puro, sem mocks e sem Spring. As regras de negócio vivem aqui.                   |
| `dto` (records)     | Teste puro com o `Validator` do Jakarta (`Validation.buildDefaultValidatorFactory()`). |
| `service`           | `@ExtendWith(MockitoExtension.class)`, repositories mockados, `Clock.fixed`.           |
| `exception`         | Chamar o handler diretamente e verificar status + `ApiError`.                          |
| `controller`        | MockMvc (a definir).                                                                   |

**Comandos:**

```bash
./gradlew test                  # roda os testes e gera o relatório JaCoCo
./gradlew check                 # testes + Spotless + Checkstyle + verificação de 80%
# relatório: build/reports/jacoco/test/html/index.html
```

---

## 2. Convenções obrigatórias

### 2.1 Nome do teste: `given_when_then`

```
given<Contexto>_when<Ação>_then<ResultadoEsperado>
```

- **given:** estado ou entrada que diferencia o cenário (`givenNoAvailableCopies`).
- **when:** a ação executada no SUT, normalmente o método (`whenBorrowCopy`).
- **then:** o resultado observável (`thenThrowsBusinessException`, `thenAvailableCopiesDecrease`).

Exemplos do projeto:

- `givenAvailableCopies_whenBorrowCopy_thenAvailableCopiesDecrease`
- `givenRegisteredIsbn_whenCreate_thenThrowsBusinessExceptionAndDoesNotSave`
- `givenReturnedLoan_whenCheckOverdueAfterDueDate_thenLoanIsNotOverdue`

O nome deve descrever **comportamento**, não implementação. Não use `test1`, `testGet` ou o nome do
método sozinho.

**`@DisplayName` em português:** todo método de teste e toda classe de teste têm um `@DisplayName`
com uma frase **curta e livre em português**, descrevendo o comportamento como alguém leria no
relatório. **Não precisa seguir o formato "Dado/quando/então"**: essa estrutura já está no nome do
método.

```java
@DisplayName("Livro")
class BookTest {

    @Test
    @DisplayName("Não empresta quando não há exemplar disponível")
    void givenNoAvailableCopies_whenBorrowCopy_thenThrowsBusinessException() {
```

- Classe: o assunto (`"Livro"`, `"Serviço de empréstimos"`, `"Validação de BookRequest"`).
- Método: afirmação direta (`"Devolução registra a data"`, `"Não exclui livro com empréstimos
  ativos"`).
- Mantenha a linha do `@DisplayName` dentro das 100 colunas (o Checkstyle reprova acima disso).
- Em `@ParameterizedTest`, o `@DisplayName` descreve o comportamento e o `name` mostra a entrada,
  também em português (`name = "ISBN {0}"`). O JUnit já coloca aspas em valores do tipo texto, então
  não escreva `\"{0}\"`.

### 2.2 Estrutura AAA com comentários

Todo teste tem as três seções, nessa ordem, com os comentários e uma linha em branco entre elas:

```java

@Test
void givenAvailableCopies_whenBorrowCopy_thenAvailableCopiesDecrease() {
    // Arrange
    final Book book = bookWithCopies(2);

    // Act
    book.borrowCopy();

    // Assert
    Assertions.assertEquals(1, book.getAvailableCopies());
}
```

- **Arrange:** monta o cenário (objetos, stubs do Mockito). Se não houver nada a preparar, declare a
  entrada em uma variável para o Arrange não ficar vazio.
- **Act:** **uma única ação** sobre o SUT. Se precisar de duas ações, provavelmente são dois testes
  (_Eager Test_).
- **Assert:** só verificações. Nunca chame o SUT de novo aqui para mudar estado.

### 2.3 Exceções

`assertThrows` fica no **Act** (guardando a exceção) e a verificação da mensagem fica no **Assert**:

```java

@Test
void givenNoAvailableCopies_whenBorrowCopy_thenThrowsBusinessException() {
    // Arrange
    final Book book = bookWithCopies(1);
    book.borrowCopy();

    // Act
    final BusinessException thrown =
            Assertions.assertThrows(BusinessException.class, book::borrowCopy);

    // Assert
    Assertions.assertEquals("No copies available for this book", thrown.getMessage());
}
```

Nunca use `try/catch` no teste (_Exception Handling_ smell).

### 2.4 Assertions e Mockito qualificados

- Use `org.junit.jupiter.api.Assertions` **qualificado** (`Assertions.assertEquals`,
  `Assertions.assertTrue`, `Assertions.assertThrows`...). **Sem import estático e sem AssertJ.**
- Mockito também qualificado: `Mockito.when`, `Mockito.verify`, `Mockito.never()`,
  `ArgumentMatchers.any()`.
- Ordem do `assertEquals`: **esperado primeiro**, depois o obtido.
- Para verificar que algo **não** aconteceu:
  `Mockito.verify(this.repository, Mockito.never()).save(ArgumentMatchers.any());`

### 2.5 Mocks e fixtures

- Mockar apenas **dependências** do SUT (repositories, outros services), nunca o próprio SUT nem
  entidades simples.
- Construir o SUT no `@BeforeEach` passando os mocks no construtor. Não usar `@InjectMocks`.
- Stubs com `Mockito.when(...)` só para o que o teste realmente usa. O `MockitoExtension` usa
  _strict stubs_ e falha com stub não utilizado, o que evita _General Fixture_.
- Para `save` que devolve o próprio argumento:
  `.thenAnswer(invocation -> invocation.getArgument(0))`.
- **Datas:** nunca usar `LocalDate.now()`. Os services recebem um `Clock` e os testes usam
  `Clock.fixed(...)`, o que mantém o **R** de FIRST.
- Helpers privados (`bookWithCopies(2)`, `bookAndMemberExist()`) são bem-vindos para deixar o
  Arrange curto, desde que o nome deixe claro o cenário (evita _Mystery Guest_).

### 2.6 Estilo de código (Checkstyle e Spotless valem para os testes)

- `final` em variáveis locais e parâmetros; `this.` em atributos e métodos de instância.
- Classe e métodos de teste **package-private** (sem `public`).
- Formatação google-java-format AOSP (4 espaços, 100 colunas). O hook de pre-commit formata.
- Mensagens de erro do sistema estão em inglês. Os testes comparam a mensagem exata.

### 2.7 Cobertura com propósito: sem testes redundantes

Aumentar a cobertura é importante, mas a cobertura é **consequência** de testar comportamentos, não
a meta. As metas do TP (≥ 50 testes, ≥ 80%) não justificam inflar a suíte: testes redundantes
custam manutenção e quebram juntos a cada mudança.

**Cada teste precisa cobrir algo que nenhum outro cobre:** um comportamento, uma classe de
equivalência ou um valor-limite diferente.

Escolha os cenários assim:

- **Particionamento em classes de equivalência:** um teste por classe de entrada (válida e cada
  tipo de inválida). Ex.: ISBN com tamanho errado e ISBN com letras são classes diferentes; dois
  ISBNs com tamanho errado são a mesma classe.
- **Análise de valor-limite:** teste nas bordas, onde os bugs se concentram. Ex.: devolver no próprio
  dia do empréstimo, verificar atraso exatamente no vencimento, membro com `MAX_ACTIVE_LOANS - 1`
  e com `MAX_ACTIVE_LOANS` empréstimos.
- **Cada `throw` do SUT tem um teste**, e o caminho feliz de cada método público também.

**Evite:**

- **Dividir um mesmo cenário em vários testes** só porque há vários asserts. Se o Arrange e o Act
  são iguais, é um comportamento só: um teste com os asserts relacionados. (_Lazy Test_)
- **Testar o mock:** método que só repassa o retorno do repository (`findAll()` →
  `repository.findAll()`) não tem lógica a verificar. Ele é coberto pelos testes de controller ou
  de integração.
- **Repetir uma verificação que já tem teste próprio** (ex.: checar `isAvailable()` em todo teste
  de `Book`, sendo que ele já tem um teste dedicado).
- **Vários testes da mesma classe de equivalência** com valores diferentes.
- **Testar o framework:** getters triviais, anotações do Spring, comportamento do Bean Validation
  além das regras que o projeto definiu.

Antes de criar um teste, pergunte: **se eu apagar este teste, algum bug passaria a escapar?** Se a
resposta é não, ele é redundante.

### 2.8 Testes parametrizados (`@ParameterizedTest`)

Use **somente** quando o Arrange, o Act e o Assert são idênticos e só a entrada muda, e cada entrada
é uma **classe de equivalência diferente**:

```java
@ParameterizedTest(name = "ISBN {0}")
@ValueSource(strings = {"12345", "97885359106AB"}) // tamanho errado / letras
void givenIsbnWithWrongLengthOrLetters_whenValidate_thenReportsInvalidIsbn(final String isbn) {
    // Arrange
    final BookRequest request = new BookRequest("Dom Casmurro", "Machado", isbn, 1);

    // Act
    final Set<String> violations = ConstraintViolations.of(request);

    // Assert
    Assertions.assertEquals(Set.of("isbn: isbn must have 10 or 13 digits"), violations);
}
```

- Campos `@NotBlank`: `@NullAndEmptySource` + `@ValueSource(strings = {"   "})` cobre as três classes
  inválidas (`null`, vazio, só espaços).
- Sempre defina `name` no `@ParameterizedTest` para o relatório mostrar a entrada de cada execução.
- Prefira `@ValueSource`/`@NullAndEmptySource`; use `@CsvSource` ou `@MethodSource` só quando a
  entrada tiver mais de um valor.

**Não use** quando:

- O resultado esperado muda conforme a entrada (ex.: atraso no dia do vencimento → `false`, no dia
  seguinte → `true`). São comportamentos diferentes e merecem nomes `given_when_then` próprios.
- O Arrange muda entre os casos (mocks ou estados diferentes).
- As entradas são da mesma classe de equivalência (ex.: `0` e `-1` cópias). Isso é redundância, não
  parametrização.

**Contagem:** cada execução de um teste parametrizado aparece como um teste no relatório do Gradle.
Para o requisito de ≥ 50 testes, considere os **métodos de teste**, para não inflar a contagem com
parâmetros.

---

## 3. Checklist ao escrever um teste

1. O nome segue `given_when_then` e descreve comportamento?
2. Tem `// Arrange`, `// Act`, `// Assert`, com uma única ação no Act?
3. Usa `Assertions.` (JUnit 5) qualificado, com o valor esperado primeiro?
4. Cobre o caminho feliz **e** os cenários de erro (cada `throw` do SUT tem um teste)?
5. Cobre algo que nenhum outro teste cobre (comportamento, classe de equivalência ou limite)?
6. Está livre dos test smells da seção 6?
7. É determinístico (sem data atual, rede, ordem de execução ou `sleep`)?
8. `./gradlew check` passa e a cobertura continua ≥ 80%?

---

## 4. Fundamentos

**O que é teste de software?** Verificação automatizada de que o código se comporta como esperado.
Testes medem a qualidade do software e são essenciais porque software é complexo, evolui
continuamente e bugs têm custo alto.

**Pirâmide de Testes:**

- Base (mais numerosos): **Testes de Unidade**, rápidos, isolados e baratos.
- Meio: **Testes de Integração**, que verificam a colaboração entre componentes.
- Topo (menos numerosos): **Testes de Sistema / E2E**, lentos, custosos e frágeis.

No projeto: muitos testes de unidade (entidades, DTOs, services), alguns de integração (controllers
com MockMvc) e poucos e2e (Playwright), só para os fluxos principais.

**Benefícios dos testes automatizados:** detectam regressões, documentam o comportamento esperado,
facilitam refatoração segura e aumentam a confiança ao fazer mudanças.

**Teste de unidade:** verifica automaticamente pequenas unidades (método, classe, conjunto de
classes) de forma isolada. Deve ser pequeno, estável, simples e rápido (milissegundos). Os
frameworks xUnit (JUnit, pytest, NUnit, RSpec...) escrevem os testes na mesma linguagem da
aplicação.

---

## 5. Princípios FIRST

| Princípio             | Descrição                                                                    |
|-----------------------|------------------------------------------------------------------------------|
| **F — Fast**          | Executa em milissegundos; toda a suíte roda com frequência                   |
| **I — Independent**   | Nenhum teste depende de outro; qualquer ordem de execução deve funcionar     |
| **R — Repeatable**    | Mesmo resultado toda vez, em qualquer ambiente (sem flakiness)               |
| **S — Self-checking** | Resultado binário: verde (pass) ou vermelho (fail), sem interpretação manual |
| **T — Timely**        | Escrito próximo ao código de produção, idealmente antes                      |

**Atenção ao Repeatable:** o Google reporta que ~16% dos testes têm algum grau de flakiness. Evite
dependências de hora do sistema, dados externos, ordem de execução, threads não controladas e
chamadas de rede reais. Lembre que o CI roda nos **3 sistemas operacionais**: cuidado com separador
de caminho, fim de linha e fuso horário.

---

## 6. Catálogo de Test Smells

Test smells são sintomas de problemas no código de teste, análogos aos code smells de Fowler. Os 18
smells do catálogo:

| #  | Smell                          | Descrição                                                        | Sinal no código                                               |
|----|--------------------------------|------------------------------------------------------------------|---------------------------------------------------------------|
| 1  | **Assertion Roulette**         | Múltiplas asserções sem mensagem explicativa                     | Vários `assertEquals` sem mensagem testando coisas diferentes |
| 2  | **Conditional Test Logic**     | `if`/`for`/`while` dentro do corpo do teste                      | Torna o resultado imprevisível                                |
| 3  | **Constructor Initialization** | Usa construtor ou inicializador de campo em vez de `@BeforeEach` | `private final X sut = new X();` na classe de teste           |
| 4  | **Default Test**               | Teste gerado automaticamente nunca modificado                    | `testSomething()` vazio ou genérico                           |
| 5  | **Duplicate Assert**           | Mesma asserção repetida no mesmo teste                           | `assertEquals(x, y)` duas vezes                               |
| 6  | **Eager Test**                 | Testa múltiplos métodos do SUT no mesmo teste                    | Act chamando `methodA()`, `methodB()` e `methodC()`           |
| 7  | **Empty Test**                 | Método de teste sem corpo                                        | `@Test void x() {}`                                           |
| 8  | **Exception Handling**         | `try/catch` no corpo do teste                                    | Use `Assertions.assertThrows`                                 |
| 9  | **General Fixture**            | `@BeforeEach` inicializa objetos que nem todos os testes usam    | Fixture genérica demais                                       |
| 10 | **Ignored Test**               | `@Disabled` sem comentário explicando por quê                    | Teste desabilitado sem justificativa                          |
| 11 | **Lazy Test**                  | Vários testes que testam o mesmo método da mesma forma           | Testes redundantes sem variação de cenário                    |
| 12 | **Magic Number Test**          | Literais sem explicação nas asserções                            | `assertEquals(42, result)`: o que significa 42?               |
| 13 | **Mystery Guest**              | Depende de arquivos/recursos externos não visíveis no teste      | Acessa arquivo ou banco sem configurá-lo no teste             |
| 14 | **Redundant Print**            | `System.out.println`/log no corpo do teste                       | Sobra de debug                                                |
| 15 | **Redundant Assertion**        | Asserção sempre verdadeira                                       | `assertEquals(x, x)` ou `assertTrue(true)`                    |
| 16 | **Resource Optimism**          | Assume que um recurso externo existe/tem estado determinado      | Sem setup/teardown do recurso                                 |
| 17 | **Sensitive Equality**         | Usa `toString()` para comparar igualdade                         | `assertEquals(expected, obj.toString())`                      |
| 18 | **Sleepy Test**                | `Thread.sleep()` explícito                                       | Lento e não-repetível (viola F e R)                           |

**Como o projeto lida com alguns deles:**

- **Assertion Roulette:** várias asserções no mesmo teste são aceitas quando verificam facetas de
  **um mesmo comportamento** (ex.: `availableCopies` e `borrowedCopies` após um empréstimo). Se elas
  verificam comportamentos diferentes, separe em testes distintos.
- **Magic Number:** prefira constantes nomeadas (`Loan.LOAN_PERIOD_DAYS`, `Member.MAX_ACTIVE_LOANS`)
  ou deixe o número evidente pelo Arrange (`bookWithCopies(2)` → espera `1` após um empréstimo).
- **Sleepy Test / Repeatable:** datas sempre via `Clock.fixed`.

**Ao revisar testes, verifique cada smell acima. Ao escrever testes, evite-os ativamente.**

---

## 7. Como aplicar esta skill

**Ao escrever testes:**

1. Siga as convenções da seção 2 (nomes, AAA, Assertions, mocks).
2. Aplique FIRST.
3. Evite os 18 test smells.
4. Para cada regra de negócio, escreva o caminho feliz e cada cenário de erro.
5. Rode `./gradlew check` e confira a cobertura.

**Ao revisar testes existentes:**

1. Verifique as convenções da seção 2 e o checklist da seção 3.
2. Percorra o catálogo de test smells e aponte ocorrências.
3. Verifique a aderência a FIRST.
4. Avalie a cobertura: há classes sem teste? Métodos críticos sem cenários negativos? Abra
   `build/reports/jacoco/test/html/index.html` para ver as linhas não cobertas.
5. Procure **redundância** (seção 2.7): testes com o mesmo Arrange e Act, testes que só verificam o
   mock, várias entradas da mesma classe de equivalência. Proponha juntar ou remover.
6. Sugira melhorias concretas com o código corrigido.

**Front e e2e (Vitest e Playwright):** ainda não configurados. Antes de escrever o primeiro teste
nessas ferramentas, **confirme com o autor** se o padrão `given_when_then` + AAA vale do mesmo jeito
e como adaptar as asserções (`expect(...)`).
