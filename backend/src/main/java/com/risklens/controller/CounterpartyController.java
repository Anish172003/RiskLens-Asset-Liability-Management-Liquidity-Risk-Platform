package com.risklens.controller;

import com.risklens.dto.CounterpartyRequest;
import com.risklens.dto.CounterpartyResponse;
import com.risklens.service.CounterpartyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/counterparties")
public class CounterpartyController {

    private final CounterpartyService counterpartyService;

    public CounterpartyController(CounterpartyService counterpartyService) {
        this.counterpartyService = counterpartyService;
    }

    @GetMapping
    public ResponseEntity<List<CounterpartyResponse>> getAllCounterparties() {
        return ResponseEntity.ok(counterpartyService.getAllCounterparties());
    }

    @PostMapping
    public ResponseEntity<CounterpartyResponse> createCounterparty(@Valid @RequestBody CounterpartyRequest request) {
        return new ResponseEntity<>(counterpartyService.createCounterparty(request), HttpStatus.CREATED);
    }
}
