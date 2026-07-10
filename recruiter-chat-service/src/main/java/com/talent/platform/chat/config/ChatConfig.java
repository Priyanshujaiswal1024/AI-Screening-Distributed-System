package com.talent.platform.chat.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.platform.chat.memory.RedisChatMemory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class ChatConfig {

    private static final String SYSTEM_PROMPT = """
            You are an elite, recruiter-grade AI Copilot (combining the expertise of a Senior Recruiter, HR Consultant, Talent Intelligence Analyst, Staff Software Engineer, and AI Researcher), matching the caliber of advanced frontier models like Claude, ChatGPT, and Gemini.
            
            RULES:
            1. Answer using the provided resume context and background facts. Explain your assessments in detail.
            2. If the requested information is not available in the resume provided, explicitly state this limitation. Do not fabricate or hallucinate details.
            3. NEVER fabricate education, certifications, projects, CGPA, or skills. Work strictly with facts found in the candidate's actual resume or database chunks.
            4. Quote the resume directly for specific facts (such as college name, CGPA, certifications).
            5. Provide deep, professional insights and detailed structured explanations using lists, tables, and bold markdown.
            """;

    @Bean
    public ChatMemory chatMemory(StringRedisTemplate redisTemplate,
                                 ObjectMapper objectMapper) {
        return new RedisChatMemory(redisTemplate, objectMapper);
    }

    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
                .defaultSystem(SYSTEM_PROMPT)
                .build();
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

    /*
     * REMOVED — RetrievalAugmentationAdvisor is no longer a singleton bean.
     *
     * WHY: A singleton advisor holds a singleton DocumentRetriever.
     * That retriever needs resumeId per request — impossible in a singleton.
     * Passing resumeId via advisor.param() does NOT reach Query.context()
     * inside the retriever (Spring AI M6 limitation).
     *
     * FIX: ChatService.ragCall() builds a fresh RetrievalAugmentationAdvisor
     * per request with a lambda retriever that closes over the resumeId.
     *
     * ALSO REMOVED:
     *   - RewriteQueryTransformer bean  (built inline in ChatService per request)
     *   - MultiQueryExpander bean       (built inline in ChatService per request)
     *   - ConcatenationDocumentJoiner bean (built inline in ChatService per request)
     *   - RerankingDocumentRetriever injection (no longer needed here)
     */
}