package com.talent.platform.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "com.talent.platform.chat") // FIX E5
public class RecruiterChatServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(RecruiterChatServiceApplication.class, args);
    }
}