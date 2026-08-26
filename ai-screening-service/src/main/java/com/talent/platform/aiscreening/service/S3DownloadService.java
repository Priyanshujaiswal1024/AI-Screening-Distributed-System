package com.talent.platform.aiscreening.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.InputStream;
import java.net.URI;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3DownloadService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket:talent-intelligence-resumes-2026}")
    private String bucket;

    /**
     * Downloads raw bytes stream from S3 or internal HTTP URL.
     */
    public InputStream downloadAsStream(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new IllegalArgumentException("File URL cannot be empty");
        }

        // If internal HTTP URL, stream directly
        if (!fileUrl.contains(".amazonaws.com/")) {
            log.info("[S3DownloadService] Fetching resume from HTTP stream: {}", fileUrl);
            try {
                return URI.create(fileUrl).toURL().openStream();
            } catch (Exception e) {
                log.error("[S3DownloadService] Failed to stream from HTTP URL {}: {}", fileUrl, e.getMessage());
                throw new RuntimeException("Failed to stream resume: " + fileUrl, e);
            }
        }

        // S3 URL
        try {
            String key = extractKey(fileUrl);
            log.info("[S3DownloadService] Downloading from S3 bucket={} key={}", bucket, key);

            ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .build()
            );
            return s3Object;
        } catch (Exception e) {
            log.warn("[S3DownloadService] S3 download failed ({}), trying HTTP fallback: {}", e.getMessage(), fileUrl);
            try {
                return URI.create(fileUrl).toURL().openStream();
            } catch (Exception ex) {
                throw new RuntimeException("Resume download failed for: " + fileUrl, e);
            }
        }
    }

    private String extractKey(String s3Url) {
        int idx = s3Url.indexOf(".amazonaws.com/");
        if (idx == -1) {
            throw new IllegalArgumentException("Not a valid S3 URL: " + s3Url);
        }
        return s3Url.substring(idx + ".amazonaws.com/".length());
    }
}