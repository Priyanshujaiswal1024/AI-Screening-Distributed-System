FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/interview-scheduling-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8095
ENTRYPOINT ["java", "-jar", "app.jar"]
