package com.risklens.service;

import com.risklens.domain.CashFlow;
import com.risklens.domain.Counterparty;
import com.risklens.domain.Instrument;
import com.risklens.domain.TimeBucket;
import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.domain.enums.CashFlowStatus;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.domain.enums.ProductType;
import com.risklens.repository.CashFlowRepository;
import com.risklens.repository.TimeBucketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CashFlowServiceTest {

    @Mock
    private CashFlowRepository cashFlowRepository;

    @Mock
    private TimeBucketRepository timeBucketRepository;

    @InjectMocks
    private CashFlowService cashFlowService;

    private Instrument bulletLiability;
    private Instrument amortizingAsset;
    private List<TimeBucket> mockBuckets;

    @BeforeEach
    void setUp() {
        Counterparty counterparty = Counterparty.builder().id(1L).name("Test Bank").build();

        bulletLiability = Instrument.builder()
                .id(1L)
                .instrumentType(InstrumentType.LIABILITY)
                .productType(ProductType.DEPOSIT)
                .counterparty(counterparty)
                .principalAmount(BigDecimal.valueOf(100000))
                .interestRate(BigDecimal.valueOf(5.0))
                .originationDate(LocalDate.of(2026, 1, 1))
                .maturityDate(LocalDate.of(2027, 1, 1))
                .cashFlowFrequency(CashFlowFrequency.BULLET)
                .isFloatingRate(false)
                .build();

        amortizingAsset = Instrument.builder()
                .id(2L)
                .instrumentType(InstrumentType.ASSET)
                .productType(ProductType.LOAN)
                .counterparty(counterparty)
                .principalAmount(BigDecimal.valueOf(120000))
                .interestRate(BigDecimal.valueOf(10.0))
                .originationDate(LocalDate.of(2026, 1, 1))
                .maturityDate(LocalDate.of(2026, 4, 1)) // 3 months
                .cashFlowFrequency(CashFlowFrequency.MONTHLY) // 3 periods
                .isFloatingRate(false)
                .build();

        mockBuckets = Arrays.asList(
                TimeBucket.builder().id(1L).label("0-30d").sortOrder(1).minDays(0).maxDays(30).build(),
                TimeBucket.builder().id(2L).label("31-90d").sortOrder(2).minDays(30).maxDays(90).build(),
                TimeBucket.builder().id(3L).label("91-365d").sortOrder(3).minDays(90).maxDays(365).build(),
                TimeBucket.builder().id(4L).label("365d+").sortOrder(4).minDays(365).maxDays(null).build()
        );
    }

    @Test
    void testGenerateProjectedCashFlows_BulletRepayment() {
        List<CashFlow> flows = cashFlowService.generateProjectedCashFlows(bulletLiability);

        assertEquals(1, flows.size());
        CashFlow flow = flows.getFirst();
        assertEquals(bulletLiability.getMaturityDate(), flow.getDueDate());
        assertEquals(0, BigDecimal.valueOf(100000).compareTo(flow.getPrincipalAmount()));
        // Interest calculation: 100,000 * 0.05 * (365 days / 365) = 5,000
        assertEquals(0, BigDecimal.valueOf(5000).compareTo(flow.getInterestAmount()));
        assertEquals(CashFlowStatus.PROJECTED, flow.getStatus());
    }

    @Test
    void testGenerateProjectedCashFlows_AmortizingLoan() {
        List<CashFlow> flows = cashFlowService.generateProjectedCashFlows(amortizingAsset);

        // 3 periods (Jan 1 -> Feb 1, Feb 1 -> Mar 1, Mar 1 -> Apr 1)
        assertEquals(3, flows.size());

        // Principal should be divided equally: 120,000 / 3 = 40,000 each
        for (CashFlow flow : flows) {
            assertEquals(0, BigDecimal.valueOf(40000).compareTo(flow.getPrincipalAmount()));
        }

        // Check first flow details:
        // Due Date: 2026-02-01 (31 days from Jan 1)
        // Interest: 120,000 * 0.10 * (31 / 365) = 1,019.18
        CashFlow flow1 = flows.get(0);
        assertEquals(LocalDate.of(2026, 2, 1), flow1.getDueDate());
        assertEquals(0, BigDecimal.valueOf(1019.18).compareTo(flow1.getInterestAmount()));

        // Check second flow details:
        // Outstanding principal: 80,000
        // Due Date: 2026-03-01 (28 days from Feb 1)
        // Interest: 80,000 * 0.10 * (28 / 365) = 613.70
        CashFlow flow2 = flows.get(1);
        assertEquals(LocalDate.of(2026, 3, 1), flow2.getDueDate());
        assertEquals(0, BigDecimal.valueOf(613.70).compareTo(flow2.getInterestAmount()));
    }

    @Test
    void testAssignBuckets() {
        when(timeBucketRepository.findAllByOrderBySortOrderAsc()).thenReturn(mockBuckets);

        LocalDate asOfDate = LocalDate.of(2026, 1, 1);
        
        CashFlow cf1 = CashFlow.builder().dueDate(LocalDate.of(2026, 1, 15)).build(); // 14 days diff -> 0-30d
        CashFlow cf2 = CashFlow.builder().dueDate(LocalDate.of(2026, 2, 15)).build(); // 45 days diff -> 31-90d
        CashFlow cf3 = CashFlow.builder().dueDate(LocalDate.of(2026, 6, 15)).build(); // 165 days diff -> 91-365d
        CashFlow cf4 = CashFlow.builder().dueDate(LocalDate.of(2027, 2, 15)).build(); // 410 days diff -> 365d+

        List<CashFlow> flows = Arrays.asList(cf1, cf2, cf3, cf4);
        cashFlowService.assignBuckets(flows, asOfDate);

        assertEquals("0-30d", cf1.getBucket().getLabel());
        assertEquals("31-90d", cf2.getBucket().getLabel());
        assertEquals("91-365d", cf3.getBucket().getLabel());
        assertEquals("365d+", cf4.getBucket().getLabel());
    }
}
