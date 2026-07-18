package com.risklens.service;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import com.risklens.domain.Counterparty;
import com.risklens.domain.Instrument;
import com.risklens.domain.User;
import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.domain.enums.ProductType;
import com.risklens.dto.InstrumentRequest;
import com.risklens.dto.InstrumentResponse;
import com.risklens.exception.BadRequestException;
import com.risklens.exception.ResourceNotFoundException;
import com.risklens.repository.CounterpartyRepository;
import com.risklens.repository.InstrumentRepository;
import com.risklens.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class InstrumentService {

    private final InstrumentRepository instrumentRepository;
    private final CounterpartyRepository counterpartyRepository;
    private final UserRepository userRepository;
    private final CashFlowService cashFlowService;
    private final AuditService auditService;

    public InstrumentService(
            InstrumentRepository instrumentRepository,
            CounterpartyRepository counterpartyRepository,
            UserRepository userRepository,
            CashFlowService cashFlowService,
            AuditService auditService) {
        this.instrumentRepository = instrumentRepository;
        this.counterpartyRepository = counterpartyRepository;
        this.userRepository = userRepository;
        this.cashFlowService = cashFlowService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<InstrumentResponse> getFilteredInstruments(
            InstrumentType type, Long counterpartyId,
            LocalDate maturityStart, LocalDate maturityEnd, Pageable pageable) {
        return instrumentRepository.findFiltered(type, counterpartyId, maturityStart, maturityEnd, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public InstrumentResponse getInstrumentById(Long id) {
        Instrument instrument = instrumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Instrument not found"));
        return mapToResponse(instrument);
    }

    @Transactional
    public InstrumentResponse createInstrument(InstrumentRequest request) {
        validateDates(request.getOriginationDate(), request.getMaturityDate());

        Counterparty counterparty = counterpartyRepository.findById(request.getCounterpartyId())
                .orElseThrow(() -> new BadRequestException("Invalid counterparty ID"));

        User currentUser = getCurrentUser();

        Instrument instrument = Instrument.builder()
                .instrumentType(request.getInstrumentType())
                .productType(request.getProductType())
                .counterparty(counterparty)
                .principalAmount(request.getPrincipalAmount())
                .currency(request.getCurrency())
                .interestRate(request.getInterestRate())
                .originationDate(request.getOriginationDate())
                .maturityDate(request.getMaturityDate())
                .cashFlowFrequency(request.getCashFlowFrequency())
                .isFloatingRate(request.getIsFloatingRate())
                .createdBy(currentUser)
                .build();

        instrument = instrumentRepository.save(instrument);

        // Generate projected cash flows
        cashFlowService.generateAndSaveCashFlows(instrument);

        // Re-fetch to load lazy proxy associations after entityManager.clear()
        instrument = instrumentRepository.findById(instrument.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Instrument not found"));

        auditService.log("CREATE", "Instrument", instrument.getId(), 
                "Created " + instrument.getInstrumentType() + " instrument: " + instrument.getProductType() + ", Principal: " + instrument.getPrincipalAmount());

        return mapToResponse(instrument);
    }

    @Transactional
    public InstrumentResponse updateInstrument(Long id, InstrumentRequest request) {
        validateDates(request.getOriginationDate(), request.getMaturityDate());

        Instrument instrument = instrumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Instrument not found"));

        Counterparty counterparty = counterpartyRepository.findById(request.getCounterpartyId())
                .orElseThrow(() -> new BadRequestException("Invalid counterparty ID"));

        instrument.setInstrumentType(request.getInstrumentType());
        instrument.setProductType(request.getProductType());
        instrument.setCounterparty(counterparty);
        instrument.setPrincipalAmount(request.getPrincipalAmount());
        instrument.setCurrency(request.getCurrency());
        instrument.setInterestRate(request.getInterestRate());
        instrument.setOriginationDate(request.getOriginationDate());
        instrument.setMaturityDate(request.getMaturityDate());
        instrument.setCashFlowFrequency(request.getCashFlowFrequency());
        instrument.setIsFloatingRate(request.getIsFloatingRate());

        instrument = instrumentRepository.save(instrument);

        // Regenerate projected cash flows
        cashFlowService.generateAndSaveCashFlows(instrument);

        // Re-fetch to load lazy proxy associations after entityManager.clear()
        instrument = instrumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Instrument not found"));

        auditService.log("UPDATE", "Instrument", instrument.getId(), 
                "Updated instrument. Principal: " + instrument.getPrincipalAmount());

        return mapToResponse(instrument);
    }

    @Transactional
    public void deleteInstrument(Long id) {
        Instrument instrument = instrumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Instrument not found"));

        instrumentRepository.delete(instrument);
        auditService.log("DELETE", "Instrument", id, "Deleted instrument: " + instrument.getProductType());
    }

    @Transactional
    public int bulkUploadPdf(MultipartFile file) {
        int count = 0;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        try {
            byte[] bytes = file.getBytes();
            try (PDDocument document = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(document);
                
                if (text == null || text.trim().isEmpty()) {
                    throw new BadRequestException("PDF document is empty or contains no readable text");
                }

                String[] lines = text.split("\\r?\\n");
                for (String line : lines) {
                    String trimmedLine = line.trim();
                    if (trimmedLine.isEmpty()) continue;

                    // Skip header or example lines
                    if (trimmedLine.toLowerCase().contains("instrumenttype") || 
                        trimmedLine.toLowerCase().contains("example record")) {
                        continue;
                    }

                    // Try splitting by comma
                    String[] parts = trimmedLine.split(",");
                    if (parts.length < 10) {
                        // Fallback to splitting by whitespace/tab
                        parts = trimmedLine.split("\\s+");
                    }
                    if (parts.length < 10) continue; // Skip malformed rows

                    try {
                        InstrumentRequest request = new InstrumentRequest();
                        request.setInstrumentType(InstrumentType.valueOf(parts[0].trim().toUpperCase()));
                        request.setProductType(ProductType.valueOf(parts[1].trim().toUpperCase()));
                        request.setCounterpartyId(Long.parseLong(parts[2].trim()));
                        request.setPrincipalAmount(new BigDecimal(parts[3].trim()));
                        request.setCurrency(parts[4].trim().toUpperCase());
                        request.setInterestRate(new BigDecimal(parts[5].trim()));
                        request.setOriginationDate(LocalDate.parse(parts[6].trim(), formatter));
                        request.setMaturityDate(LocalDate.parse(parts[7].trim(), formatter));
                        request.setCashFlowFrequency(CashFlowFrequency.valueOf(parts[8].trim().toUpperCase()));
                        request.setIsFloatingRate(Boolean.parseBoolean(parts[9].trim()));

                        createInstrument(request);
                        count++;
                    } catch (Exception e) {
                        throw new BadRequestException("Error parsing PDF line '" + trimmedLine + "': " + e.getMessage());
                    }
                }
            }
        } catch (IOException e) {
            throw new BadRequestException("Failed to read PDF file: " + e.getMessage());
        }

        if (count == 0) {
            throw new BadRequestException("No valid instrument records found in the PDF. Please verify that the PDF contains data formatted in the required layout.");
        }

        return count;
    }

    private void validateDates(LocalDate origination, LocalDate maturity) {
        if (maturity.isBefore(origination) || maturity.isEqual(origination)) {
            throw new BadRequestException("Maturity date must be after origination date");
        }
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    private InstrumentResponse mapToResponse(Instrument instrument) {
        return InstrumentResponse.builder()
                .id(instrument.getId())
                .instrumentType(instrument.getInstrumentType())
                .productType(instrument.getProductType())
                .counterpartyId(instrument.getCounterparty().getId())
                .counterpartyName(instrument.getCounterparty().getName())
                .principalAmount(instrument.getPrincipalAmount())
                .currency(instrument.getCurrency())
                .interestRate(instrument.getInterestRate())
                .originationDate(instrument.getOriginationDate())
                .maturityDate(instrument.getMaturityDate())
                .cashFlowFrequency(instrument.getCashFlowFrequency())
                .isFloatingRate(instrument.getIsFloatingRate())
                .createdByEmail(instrument.getCreatedBy() != null ? instrument.getCreatedBy().getEmail() : "SYSTEM")
                .build();
    }
}
