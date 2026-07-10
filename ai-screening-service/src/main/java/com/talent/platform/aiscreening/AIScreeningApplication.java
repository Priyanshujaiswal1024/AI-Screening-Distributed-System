package com.talent.platform.aiscreening;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * CHANGED: Added @EnableFeignClients to activate ResumeManagementClient.
 * Previously this annotation was absent because ai-screening-service had no
 * Feign clients — it used JdbcTemplate cross-service calls instead.
 */
@SpringBootApplication
@EnableFeignClients
public class AIScreeningApplication {
    public static void main(String[] args) {
        SpringApplication.run(AIScreeningApplication.class, args);
    }
}