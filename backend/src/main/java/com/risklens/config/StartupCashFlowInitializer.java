package com.risklens.config;

import com.risklens.domain.Instrument;
import com.risklens.repository.CashFlowRepository;
import com.risklens.repository.InstrumentRepository;
import com.risklens.service.CashFlowService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class StartupCashFlowInitializer implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(StartupCashFlowInitializer.class);

    private final InstrumentRepository instrumentRepository;
    private final CashFlowRepository cashFlowRepository;
    private final CashFlowService cashFlowService;

    public StartupCashFlowInitializer(
            InstrumentRepository instrumentRepository,
            CashFlowRepository cashFlowRepository,
            CashFlowService cashFlowService) {
        this.instrumentRepository = instrumentRepository;
        this.cashFlowRepository = cashFlowRepository;
        this.cashFlowService = cashFlowService;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        long count = cashFlowRepository.count();
        if (count == 0) {
            logger.info("No projected cash flows found in the database. Initializing schedules for seeded instruments...");
            List<Instrument> instruments = instrumentRepository.findAll();
            for (Instrument instrument : instruments) {
                try {
                    cashFlowService.generateAndSaveCashFlows(instrument);
                } catch (Exception e) {
                    logger.error("Failed to generate cash flows for instrument # {}: {}", instrument.getId(), e.getMessage());
                }
            }
            logger.info("Successfully generated projected cash flows for {} instruments.", instruments.size());
        } else {
            logger.info("Found {} projected cash flows in the database. Skipping startup initialization.", count);
        }
    }
}
