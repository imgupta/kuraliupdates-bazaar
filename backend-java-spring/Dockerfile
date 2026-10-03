# Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache unzip
COPY --from=builder /app/target/kurali-bazaar-api-1.0.0-SNAPSHOT.jar app.jar

# Automatically unpack wallet if present in backend-java-spring
COPY . /tmp/source/
RUN mkdir -p /app/wallet && \
    ( for f in /tmp/source/Wallet*.zip /tmp/source/wallet*.zip /tmp/source/*.zip; do [ -f "$f" ] && unzip -o "$f" -d /app/wallet && break; done || true ) && \
    ( [ -d /tmp/source/wallet ] && cp -r /tmp/source/wallet/* /app/wallet/ || true ) && \
    ( [ -f /tmp/source/cwallet.sso ] && cp /tmp/source/* /app/wallet/ || true ) && \
    ( [ -f /app/wallet/sqlnet.ora ] && sed -i 's|DIRECTORY=".*"|DIRECTORY="/app/wallet"|g' /app/wallet/sqlnet.ora || true ) && \
    rm -rf /tmp/source

EXPOSE 8080
ENV PORT=8080
ENV TNS_ADMIN=/app/wallet
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-Doracle.net.tns_admin=/app/wallet", "-jar", "app.jar"]
