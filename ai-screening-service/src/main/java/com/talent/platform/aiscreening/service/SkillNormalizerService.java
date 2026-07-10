package com.talent.platform.aiscreening.service;

import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import java.util.*;

@Service
@Slf4j
public class SkillNormalizerService {

    private static final Map<String, List<String>> ALIAS_MAP = new LinkedHashMap<>();

    static {
        ALIAS_MAP.put("react", List.of("reactjs", "react.js", "react js", "react18", "react 18", "react v18", "react frontend", "react developer"));
        ALIAS_MAP.put("node.js", List.of("nodejs", "node js", "node", "nodejsframework"));
        ALIAS_MAP.put("tailwind css", List.of("tailwindcss", "tailwind", "tailwind-css", "tailwind ui"));
        ALIAS_MAP.put("typescript", List.of("ts", "type script", "typescript 5", "typescript developer"));
        ALIAS_MAP.put("css3", List.of("css", "css 3", "cascading style sheets", "html/css", "html css"));
        ALIAS_MAP.put("javascript", List.of("js", "es6", "es2022", "es2023", "vanilla js", "ecmascript", "javascript developer", "js developer"));
        ALIAS_MAP.put("express", List.of("expressjs", "express.js", "express js", "express framework"));
        ALIAS_MAP.put("mongodb", List.of("mongo db", "mongo", "mongodb atlas", "nosql mongodb"));
        ALIAS_MAP.put("postgresql", List.of("postgres", "psql", "pg", "postgresql database"));
        ALIAS_MAP.put("redux", List.of("redux toolkit", "rtk", "react-redux", "redux js"));
        ALIAS_MAP.put("java", List.of("java 17", "java 21", "java 8", "java developer", "core java"));
        ALIAS_MAP.put("spring boot", List.of("springboot", "spring-boot", "spring framework boot"));
        ALIAS_MAP.put("mysql", List.of("my sql", "mysql database", "mysql 8"));
        ALIAS_MAP.put("docker", List.of("docker container", "dockerfile", "docker compose"));
        ALIAS_MAP.put("kubernetes", List.of("k8s", "kube", "kubectl"));
        ALIAS_MAP.put("git", List.of("github", "gitlab", "git version control"));
        ALIAS_MAP.put("html", List.of("html5", "html 5", "html css", "html/css"));
        ALIAS_MAP.put("bootstrap", List.of("bootstrap 5", "bootstrap css", "bootstrap framework"));
        ALIAS_MAP.put("socket.io", List.of("socketio", "socket io", "websocket"));
        ALIAS_MAP.put("php", List.of("php 8", "php developer", "php language"));
    }

    public enum MatchConfidence {
        EXACT, ALIAS, PARTIAL, NO_MATCH
    }

    public static class NormalizationResult {
        private final String canonicalName;
        private final MatchConfidence confidence;

        public NormalizationResult(String canonicalName, MatchConfidence confidence) {
            this.canonicalName = canonicalName;
            this.confidence = confidence;
        }

        public String getCanonicalName() { return canonicalName; }
        public MatchConfidence getConfidence() { return confidence; }
    }

    private String cleanString(String s) {
        if (s == null) return "";
        return s.toLowerCase().replaceAll("[.\\-\\s]+", "").trim();
    }

    public String normalize(String skill) {
        if (skill == null || skill.isBlank()) return "";
        String clean = cleanString(skill);

        // 1. Direct Canonical check
        for (String canonical : ALIAS_MAP.keySet()) {
            if (cleanString(canonical).equals(clean)) {
                return canonical;
            }
        }

        // 2. Alias match check
        for (Map.Entry<String, List<String>> entry : ALIAS_MAP.entrySet()) {
            for (String alias : entry.getValue()) {
                if (cleanString(alias).equals(clean)) {
                    return entry.getKey();
                }
            }
        }

        // 3. Partial check
        for (Map.Entry<String, List<String>> entry : ALIAS_MAP.entrySet()) {
            String canonicalClean = cleanString(entry.getKey());
            if (clean.contains(canonicalClean) || canonicalClean.contains(clean)) {
                return entry.getKey();
            }
            for (String alias : entry.getValue()) {
                String aliasClean = cleanString(alias);
                if (clean.contains(aliasClean) || aliasClean.contains(clean)) {
                    return entry.getKey();
                }
            }
        }

        return skill.trim();
    }

    public boolean skillsMatch(String s1, String s2) {
        if (s1 == null || s2 == null) return false;
        String clean1 = cleanString(s1);
        String clean2 = cleanString(s2);
        if (clean1.equals(clean2)) return true;

        String norm1 = normalize(s1);
        String norm2 = normalize(s2);
        if (norm1.equalsIgnoreCase(norm2)) return true;

        return clean1.contains(clean2) || clean2.contains(clean1);
    }

    public MatchConfidence getMatchConfidence(String s1, String s2) {
        if (s1 == null || s2 == null) return MatchConfidence.NO_MATCH;
        String clean1 = cleanString(s1);
        String clean2 = cleanString(s2);
        if (clean1.equals(clean2)) return MatchConfidence.EXACT;

        String norm1 = normalize(s1);
        String norm2 = normalize(s2);
        if (!norm1.isEmpty() && norm1.equalsIgnoreCase(norm2)) return MatchConfidence.ALIAS;

        if (clean1.contains(clean2) || clean2.contains(clean1)) return MatchConfidence.PARTIAL;

        return MatchConfidence.NO_MATCH;
    }

    public boolean resumeContainsSkill(String required, List<String> skills) {
        if (required == null || skills == null) return false;
        for (String skill : skills) {
            if (skillsMatch(required, skill)) {
                return true;
            }
        }
        return false;
    }

    public boolean resumeTextContainsSkill(String required, String rawText) {
        if (required == null || rawText == null) return false;
        String cleanReq = cleanString(required);
        String cleanText = cleanString(rawText);
        if (cleanText.contains(cleanReq)) return true;

        String canonical = normalize(required);
        List<String> aliases = ALIAS_MAP.get(canonical);
        if (aliases != null) {
            for (String alias : aliases) {
                if (cleanText.contains(cleanString(alias))) {
                    return true;
                }
            }
        }
        return false;
    }
}
