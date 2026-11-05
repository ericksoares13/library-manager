# Estágio 1: compila o back e o front (o Gradle baixa o Node) e gera o jar executável
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Wrapper e scripts de build primeiro: a camada com o Gradle baixado é reaproveitada entre builds
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --version --no-daemon

COPY config config
COPY frontend frontend
COPY src src
RUN ./gradlew bootJar --no-daemon

# Estágio 2: só o JRE e o jar
FROM eclipse-temurin:25-jre
WORKDIR /app

RUN useradd --system --no-create-home app
USER app

COPY --from=build /app/build/libs/library-manager-*-SNAPSHOT.jar app.jar

# O Render define a porta na variável PORT (lida pelo application.yml; padrão 8080)
EXPOSE 8080
# Plano gratuito do Render: 512 MB e 0,1 CPU. Heap de até 60% (sobra para o resto da JVM)
# e o coletor de lixo serial, que gasta menos memória e CPU em containers pequenos
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-XX:+UseSerialGC", "-jar", "app.jar"]
