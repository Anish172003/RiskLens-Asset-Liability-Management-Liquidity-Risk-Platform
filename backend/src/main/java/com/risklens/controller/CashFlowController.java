package com.risklens.controller;

import com.risklens.dto.CashFlowResponse;
import com.risklens.service.CashFlowService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cashflows")
public class CashFlowController {

    private final CashFlowService cashFlowService;

    public CashFlowController(CashFlowService cashFlowService) {
        this.cashFlowService = cashFlowService;
    }

    @GetMapping("/instrument/{instrumentId}")
    public ResponseEntity<List<CashFlowResponse>> getCashFlowsByInstrument(@PathVariable Long instrumentId) {
        return ResponseEntity.ok(cashFlowService.getCashFlowsByInstrument(instrumentId));
    }
}
