package com.risklens.service;

import com.risklens.domain.Counterparty;
import com.risklens.dto.CounterpartyRequest;
import com.risklens.dto.CounterpartyResponse;
import com.risklens.repository.CounterpartyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CounterpartyService {

    private final CounterpartyRepository counterpartyRepository;
    private final AuditService auditService;

    public CounterpartyService(CounterpartyRepository counterpartyRepository, AuditService auditService) {
        this.counterpartyRepository = counterpartyRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CounterpartyResponse> getAllCounterparties() {
        return counterpartyRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CounterpartyResponse createCounterparty(CounterpartyRequest request) {
        Counterparty counterparty = Counterparty.builder()
                .name(request.getName())
                .type(request.getType())
                .build();

        counterparty = counterpartyRepository.save(counterparty);
        auditService.log("CREATE", "Counterparty", counterparty.getId(), "Created counterparty: " + counterparty.getName());

        return mapToResponse(counterparty);
    }

    private CounterpartyResponse mapToResponse(Counterparty counterparty) {
        return CounterpartyResponse.builder()
                .id(counterparty.getId())
                .name(counterparty.getName())
                .type(counterparty.getType())
                .build();
    }
}
