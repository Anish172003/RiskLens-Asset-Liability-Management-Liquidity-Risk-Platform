package com.risklens.controller;

import com.risklens.domain.enums.InstrumentType;
import com.risklens.dto.InstrumentRequest;
import com.risklens.dto.InstrumentResponse;
import com.risklens.service.InstrumentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/instruments")
public class InstrumentController {

    private final InstrumentService instrumentService;

    public InstrumentController(InstrumentService instrumentService) {
        this.instrumentService = instrumentService;
    }

    @GetMapping
    public ResponseEntity<Page<InstrumentResponse>> getInstruments(
            @RequestParam(required = false) InstrumentType type,
            @RequestParam(required = false) Long counterpartyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate maturityStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate maturityEnd,
            Pageable pageable) {
        return ResponseEntity.ok(instrumentService.getFilteredInstruments(type, counterpartyId, maturityStart, maturityEnd, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InstrumentResponse> getInstrumentById(@PathVariable Long id) {
        return ResponseEntity.ok(instrumentService.getInstrumentById(id));
    }

    @PostMapping
    public ResponseEntity<InstrumentResponse> createInstrument(@Valid @RequestBody InstrumentRequest request) {
        return new ResponseEntity<>(instrumentService.createInstrument(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InstrumentResponse> updateInstrument(
            @PathVariable Long id,
            @Valid @RequestBody InstrumentRequest request) {
        return ResponseEntity.ok(instrumentService.updateInstrument(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInstrument(@PathVariable Long id) {
        instrumentService.deleteInstrument(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadPdf(@RequestParam("file") MultipartFile file) {
        int count = instrumentService.bulkUploadPdf(file);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully imported " + count + " instruments from PDF."
        ));
    }
}
