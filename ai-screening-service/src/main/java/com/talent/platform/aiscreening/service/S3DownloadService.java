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

@Service
@RequiredArgsConstructor
@Slf4j
public class S3DownloadService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    /**
     * Given a full S3 URL like:
     * https://talent-resumes-bucket.s3.us-east-1.amazonaws.com/resumes/uuid_file.pdf
     * extracts the key and downloads the raw bytes stream.
     */
    public InputStream downloadAsStream(String s3Url) {
        String key = extractKey(s3Url);
        log.info("Downloading from S3 bucket={} key={}", bucket, key);

        ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(
                GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build()
        );
        return s3Object; // S3Object IS an InputStream
    }

    private String extractKey(String s3Url) {
        // URL format: https://bucket.s3.region.amazonaws.com/resumes/uuid_file.pdf
        // Key is everything after the first "/" following ".amazonaws.com"
        int idx = s3Url.indexOf(".amazonaws.com/");
        if (idx == -1) {
            throw new IllegalArgumentException("Not a valid S3 URL: " + s3Url);
        }
        return s3Url.substring(idx + ".amazonaws.com/".length());
    }
}