package com.talent.platform.resumemanagementservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket:talent-intelligence-resumes-2026}")
    private String bucket;

    @Value("${aws.s3.region:eu-north-1}")
    private String region;

    public static final String LOCAL_DIR = System.getProperty("java.io.tmpdir") + File.separator + "talent_resumes";

    public String upload(MultipartFile file) {
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        String key = "resumes/" + filename;

        // 1. Try S3 Upload first
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes())
            );
            log.info("[StorageService] Successfully uploaded to S3: bucket={} key={}", bucket, key);
            return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
        } catch (Exception e) {
            log.warn("[StorageService] S3 upload failed ({}), activating local fallback: {}", e.getMessage(), filename);
        }

        // 2. Resilient local filesystem fallback
        try {
            Path uploadPath = Paths.get(LOCAL_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path targetPath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("[StorageService] Saved to local fallback storage: {}", targetPath.toAbsolutePath());
            return "http://talent-resume-service:8073/api/v1/resumes/raw-file/" + filename;
        } catch (Exception ex) {
            log.error("[StorageService] Local storage fallback failed: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to store file in S3 and local storage: " + ex.getMessage(), ex);
        }
    }

    public InputStream download(String fileUrl) throws Exception {
        if (fileUrl != null && fileUrl.contains(".amazonaws.com/")) {
            try {
                String key = fileUrl.substring(fileUrl.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
                return s3Client.getObject(
                        software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                                .bucket(bucket)
                                .key(key)
                                .build()
                );
            } catch (Exception e) {
                log.warn("[StorageService] S3 getObject failed for {}, checking local fallback", fileUrl);
            }
        }

        // Check local storage by filename
        String filename = fileUrl != null && fileUrl.contains("/") ? fileUrl.substring(fileUrl.lastIndexOf("/") + 1) : fileUrl;
        Path filePath = Paths.get(LOCAL_DIR, filename);
        if (Files.exists(filePath)) {
            return new FileInputStream(filePath.toFile());
        }

        throw new IllegalArgumentException("Cannot locate resume file for URL: " + fileUrl);
    }

    public void delete(String fileUrl) {
        if (fileUrl == null) return;
        try {
            if (fileUrl.contains(".amazonaws.com/")) {
                String key = fileUrl.substring(fileUrl.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
                s3Client.deleteObject(
                        software.amazon.awssdk.services.s3.model.DeleteObjectRequest.builder()
                                .bucket(bucket)
                                .key(key)
                                .build()
                );
            } else {
                String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
                Path filePath = Paths.get(LOCAL_DIR, filename);
                Files.deleteIfExists(filePath);
            }
        } catch (Exception e) {
            log.warn("[StorageService] Delete non-fatal warning: {}", e.getMessage());
        }
    }
}