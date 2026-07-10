package com.talent.platform.aiscreening.parser;

import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;

@Component
public class TextChunker {

    private static final int TARGET_CHUNK_CHARS = 800;
    private static final int OVERLAP_CHARS = 120;

    /**
     * FIX C4: Sentence-aware chunking.
     * Splits at sentence boundaries (.!?) so chunks contain
     * complete sentences, preserving semantic meaning at edges.
     */
    public List<String> chunk(String text) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) return chunks;

        // Split into sentences
        String[] sentences = text.split("(?<=[.!?])\\s+");
        StringBuilder current = new StringBuilder();

        for (String sentence : sentences) {
            if (current.length() + sentence.length() > TARGET_CHUNK_CHARS && !current.isEmpty()) {
                chunks.add(current.toString().trim());
                // Overlap: keep last OVERLAP_CHARS of previous chunk
                String prev = current.toString();
                current = new StringBuilder(
                        prev.length() > OVERLAP_CHARS
                                ? prev.substring(prev.length() - OVERLAP_CHARS)
                                : prev
                );
            }
            current.append(sentence).append(" ");
        }
        if (!current.isEmpty()) chunks.add(current.toString().trim());
        return chunks;
    }
}