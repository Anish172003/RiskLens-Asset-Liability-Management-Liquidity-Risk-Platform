package com.risklens.controller;

import com.risklens.domain.Instrument;
import com.risklens.domain.User;
import com.risklens.repository.UserRepository;
import com.risklens.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;
    private final UserRepository userRepository;

    public AiController(AiService aiService, UserRepository userRepository) {
        this.aiService = aiService;
        this.userRepository = userRepository;
    }

    @PostMapping("/insights")
    public ResponseEntity<Map<String, String>> getInsights(@RequestBody Map<String, Object> reportData) {
        // Convert map to string representation for LLM prompt
        String reportJson = reportData.toString();
        String insights = aiService.getLiquidityInsights(reportJson);
        return ResponseEntity.ok(Map.of("insights", insights));
    }

    @PostMapping("/generate-data")
    public ResponseEntity<Map<String, Object>> generateData(@RequestBody Map<String, Object> payload) {
        int count = Integer.parseInt(payload.getOrDefault("count", "10").toString());
        String portfolioStyle = payload.getOrDefault("style", "BALANCED").toString();
        
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(currentEmail).orElse(null);
        Long userId = user != null ? user.getId() : 1L; // fallback to admin if not found

        List<Instrument> generated = aiService.generateRealData(count, portfolioStyle, userId);
        
        return ResponseEntity.ok(Map.of(
            "message", "Successfully generated " + generated.size() + " realistic financial instruments and project cash flows.",
            "count", generated.size()
        ));
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(currentEmail).orElse(null);
        Long userId = user != null ? user.getId() : 1L; // fallback to admin

        String response = aiService.chat(message, userId);
        return ResponseEntity.ok(Map.of("response", response));
    }
}
