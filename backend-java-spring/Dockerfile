# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/kurali-bazaar-api-1.0.0-SNAPSHOT.jar app.jar

# Oracle wallet files must be mounted as protected Render secret files.
# Do not bundle wallet material into the image or repository.
ENV PORT=8080
ENV ORACLE_WALLET_DIR=/etc/secrets
ENV TNS_ADMIN=/etc/secrets

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
