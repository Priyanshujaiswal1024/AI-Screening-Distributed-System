package com.talent.platform.aiscreening.parser;

import com.talent.platform.aiscreening.service.S3DownloadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class TikaParser {

    private final Tika tika = new Tika();
    private final S3DownloadService s3DownloadService;

    /**
     * Parses a resume file from its S3 URL.
     *
     * Flow:
     *   S3 URL (stored in DB)
     *       → S3DownloadService downloads raw bytes as InputStream
     *       → Apache Tika reads the stream and extracts plain text
     *       → plain text returned for chunking + embedding
     */
    public String parse(String fileUrl) {
        log.info("[TikaParser] Parsing file from URL: {}", fileUrl);
        try {
            // Download the actual PDF/DOCX bytes from S3 using AWS SDK
            // (NOT new URL().openStream() which fails on private buckets)
            try (InputStream stream = s3DownloadService.downloadAsStream(fileUrl)) {
                String text = tika.parseToString(stream);
                log.info("[TikaParser] Extracted {} characters from file", text.length());
                return text;
            }
        } catch (Exception e) {
            log.error("[TikaParser] Failed to parse {}: {}", fileUrl, e.getMessage());
            throw new RuntimeException("Resume parsing failed for: " + fileUrl, e);
        }
    }
}