package com.risklens.controller;

import com.risklens.dto.GapReportResponse;
import com.risklens.service.LiquidityGapService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/liquidity-gap")
public class LiquidityGapController {

    private final LiquidityGapService gapService;

    public LiquidityGapController(LiquidityGapService gapService) {
        this.gapService = gapService;
    }

    @GetMapping("/report")
    public ResponseEntity<List<GapReportResponse>> getGapReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportDate) {
        LocalDate date = (reportDate != null) ? reportDate : LocalDate.now();
        return ResponseEntity.ok(gapService.computeGapReport(date));
    }

    @GetMapping("/dates")
    public ResponseEntity<List<LocalDate>> getAvailableReportDates() {
        return ResponseEntity.ok(gapService.getAvailableReportDates());
    }
}
