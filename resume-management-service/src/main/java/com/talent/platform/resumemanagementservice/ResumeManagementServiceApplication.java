package com.talent.platform.resumemanagementservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ResumeManagementServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ResumeManagementServiceApplication.class, args);
    }
}
