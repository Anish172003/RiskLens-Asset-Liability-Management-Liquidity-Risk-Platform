package com.risklens.service;

import com.risklens.domain.*;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.dto.GapReportResponse;
import com.risklens.repository.CashFlowRepository;
import com.risklens.repository.LiquidityGapReportRepository;
import com.risklens.repository.TimeBucketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LiquidityGapServiceTest {

    @Mock
    private LiquidityGapReportRepository gapReportRepository;

    @Mock
    private CashFlowRepository cashFlowRepository;

    @Mock
    private TimeBucketRepository timeBucketRepository;

    @Mock
    private CashFlowService cashFlowService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private LiquidityGapService liquidityGapService;

    private TimeBucket bucket1;
    private TimeBucket bucket2;
    private List<TimeBucket> mockBuckets;

    @BeforeEach
    void setUp() {
        bucket1 = TimeBucket.builder().id(1L).label("0-7d").sortOrder(1).minDays(0).maxDays(7).build();
        bucket2 = TimeBucket.builder().id(2L).label("8-14d").sortOrder(2).minDays(7).maxDays(14).build();
        mockBuckets = Arrays.asList(bucket1, bucket2);
    }

    @Test
    void testComputeGapReport() {
        LocalDate reportDate = LocalDate.of(2026, 7, 17);

        Instrument asset = Instrument.builder().instrumentType(InstrumentType.ASSET).build();
        Instrument liability = Instrument.builder().instrumentType(InstrumentType.LIABILITY).build();

        CashFlow cfAsset = CashFlow.builder()
                .instrument(asset)
                .principalAmount(BigDecimal.valueOf(1000))
                .interestAmount(BigDecimal.valueOf(100))
                .bucket(bucket1)
                .dueDate(reportDate.plusDays(2))
                .build(); // Total amount: 1100

        CashFlow cfLiability1 = CashFlow.builder()
                .instrument(liability)
                .principalAmount(BigDecimal.valueOf(500))
                .interestAmount(BigDecimal.valueOf(50))
                .bucket(bucket1)
                .dueDate(reportDate.plusDays(4))
                .build(); // Total amount: 550

        CashFlow cfLiability2 = CashFlow.builder()
                .instrument(liability)
                .principalAmount(BigDecimal.valueOf(300))
                .interestAmount(BigDecimal.valueOf(0))
                .bucket(bucket2)
                .dueDate(reportDate.plusDays(10))
                .build(); // Total amount: 300

        List<CashFlow> mockCashFlows = Arrays.asList(cfAsset, cfLiability1, cfLiability2);

        when(timeBucketRepository.findAllByOrderBySortOrderAsc()).thenReturn(mockBuckets);
        when(cashFlowRepository.findAllWithInstrumentByDueDateGreaterThanEqual(reportDate)).thenReturn(mockCashFlows);

        List<GapReportResponse> reports = liquidityGapService.computeGapReport(reportDate);

        // computeGapReport is read-only — no deletes, no bucket updates, no saves
        verify(gapReportRepository, never()).deleteByReportDate(any());
        verify(cashFlowService, never()).updateAllCashFlowBuckets(any());
        verify(gapReportRepository, never()).saveAll(any());

        assertEquals(2, reports.size());

        // totalAllAssets = 1100 (only bucket1 has assets)

        // Check bucket 1 report (0-7d)
        // Assets: 1100, Liabilities: 550
        // Gap: 550, Cumulative gap: 550
        // Ratio: 550 / 1100 = 0.500000
        GapReportResponse r1 = reports.get(0);
        assertEquals("0-7d", r1.getBucketLabel());
        assertEquals(0, BigDecimal.valueOf(1100).compareTo(r1.getTotalAssets()));
        assertEquals(0, BigDecimal.valueOf(550).compareTo(r1.getTotalLiabilities()));
        assertEquals(0, BigDecimal.valueOf(550).compareTo(r1.getGap()));
        assertEquals(0, BigDecimal.valueOf(550).compareTo(r1.getCumulativeGap()));
        assertEquals(0, BigDecimal.valueOf(0.5).compareTo(r1.getGapRatio()));

        // Check bucket 2 report (8-14d)
        // Assets: 0, Liabilities: 300
        // Gap: -300, Cumulative gap: 250
        // Ratio: 250 / 1100 = 0.227273 (new code uses totalAllAssets as denominator)
        GapReportResponse r2 = reports.get(1);
        assertEquals("8-14d", r2.getBucketLabel());
        assertEquals(0, BigDecimal.valueOf(0).compareTo(r2.getTotalAssets()));
        assertEquals(0, BigDecimal.valueOf(300).compareTo(r2.getTotalLiabilities()));
        assertEquals(0, BigDecimal.valueOf(-300).compareTo(r2.getGap()));
        assertEquals(0, BigDecimal.valueOf(250).compareTo(r2.getCumulativeGap()));
        BigDecimal expectedRatio = BigDecimal.valueOf(250).divide(BigDecimal.valueOf(1100), 6, RoundingMode.HALF_UP);
        assertEquals(0, expectedRatio.compareTo(r2.getGapRatio()));
    }

    @Test
    void testComputeGapReportEmptyBuckets() {
        LocalDate reportDate = LocalDate.of(2026, 7, 17);

        when(timeBucketRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of());

        List<GapReportResponse> reports = liquidityGapService.computeGapReport(reportDate);

        assertTrue(reports.isEmpty());
        verify(cashFlowRepository, never()).findAllWithInstrumentByDueDateGreaterThanEqual(any());
    }
}
