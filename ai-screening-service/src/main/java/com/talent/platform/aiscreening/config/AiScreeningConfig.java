package com.talent.platform.aiscreening.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemory;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class AiScreeningConfig {

    // REMOVE this — Spring AI auto-config already provides ChatClient
    // If you need custom config (default system prompt, advisors), use:

    @Bean("screeningChatClient")
    @Primary  // mark as primary if you must keep it
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
                // .defaultSystem("...") // optional
                .build();
    }

    @Bean
    public ChatMemory chatMemory() {
        return new InMemoryChatMemory();
    }

    @Bean
    public org.springframework.boot.web.client.RestClientCustomizer restClientCustomizer() {
        return restClientBuilder -> {
            var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(java.time.Duration.ofSeconds(60));
            factory.setReadTimeout(java.time.Duration.ofMinutes(5));
            restClientBuilder.requestFactory(factory);
        };
    }
}