package com.talent.platform.aiscreening.copilot.controller;//package com.talent.platform.copilot.controller;

//import com.talent.platform.copilot.dto.CopilotDtos;
//import com.talent.platform.copilot.service.CopilotService;
import com.talent.platform.aiscreening.copilot.dto.CopilotDtos;
import com.talent.platform.aiscreening.copilot.service.CopilotService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/copilot")
@RequiredArgsConstructor
public class CopilotController {

    private final CopilotService copilotService;

    /**
     * POST /api/v1/copilot/chat
     *
     * Examples:
     *   "Find top 5 Java Spring Boot candidates for job 046cf132-..."
     *   "Who are the best Kafka developers we have screened?"
     *   "Generate interview questions for candidate abc123 applying to job xyz456"
     *   "What skill gaps does candidate priyanshu@gmail.com have?"
     */
    @PostMapping("/chat")
    public ResponseEntity<CopilotDtos.CopilotResponse> chat(
            @Valid @RequestBody CopilotRequest request,
            @RequestHeader("X-User-Email") String recruiterEmail
    ) {
        CopilotDtos.CopilotResponse response = copilotService.chat(
                new CopilotDtos.CopilotRequest(
                        request.message(),
                        request.jobDescriptionId(),
                        request.conversationId(),
                        request.mode()
                ),
                recruiterEmail
        );
        return ResponseEntity.ok(response);
    }

    // Inner validated request record
    record CopilotRequest(
            @NotBlank(message = "message must not be blank")
            @Size(max = 2000)
            String message,
            String jobDescriptionId,
            String conversationId,
            CopilotDtos.CopilotMode mode
    ) {}
}