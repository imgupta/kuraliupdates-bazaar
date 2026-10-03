# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache unzip
COPY --from=builder /app/target/kurali-bazaar-api-1.0.0-SNAPSHOT.jar app.jar

# Setup wallet
RUN mkdir -p /app/wallet
COPY Wallet*.zip /tmp/
RUN unzip -o /tmp/Wallet*.zip -d /app/wallet && \
    sed -i 's|DIRECTORY=".*"|DIRECTORY="/app/wallet"|g' /app/wallet/sqlnet.ora && \
    rm -rf /tmp/Wallet*.zip

EXPOSE 8080
ENV PORT=8080
ENV TNS_ADMIN=/app/wallet
ENTRYPOINT ["java", "-jar", "app.jar"]
