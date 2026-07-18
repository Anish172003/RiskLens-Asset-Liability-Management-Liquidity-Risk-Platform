package com.risklens.service;

import com.risklens.domain.CashFlow;
import com.risklens.domain.LiquidityGapReport;
import com.risklens.domain.TimeBucket;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.dto.GapReportResponse;
import com.risklens.repository.CashFlowRepository;
import com.risklens.repository.LiquidityGapReportRepository;
import com.risklens.repository.TimeBucketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LiquidityGapService {
    private static final Logger logger = LoggerFactory.getLogger(LiquidityGapService.class);

    private final LiquidityGapReportRepository gapReportRepository;
    private final CashFlowRepository cashFlowRepository;
    private final TimeBucketRepository timeBucketRepository;
    private final CashFlowService cashFlowService;
    private final AuditService auditService;

    public LiquidityGapService(
            LiquidityGapReportRepository gapReportRepository,
            CashFlowRepository cashFlowRepository,
            TimeBucketRepository timeBucketRepository,
            CashFlowService cashFlowService,
            AuditService auditService) {
        this.gapReportRepository = gapReportRepository;
        this.cashFlowRepository = cashFlowRepository;
        this.timeBucketRepository = timeBucketRepository;
        this.cashFlowService = cashFlowService;
        this.auditService = auditService;
    }

    /**
     * Generate gap report on the fly without persisting (avoids delete/insert conflicts).
     * Computes directly from cash flows in memory.
     */
    @Transactional(readOnly = true)
    public List<GapReportResponse> computeGapReport(LocalDate reportDate) {
        logger.info("Computing liquidity gap report for date: {}", reportDate);

        // Fetch all buckets
        List<TimeBucket> buckets = timeBucketRepository.findAllByOrderBySortOrderAsc();
        if (buckets.isEmpty()) {
            logger.warn("No time buckets configured. Returning empty report.");
            return List.of();
        }

        // Fetch all cash flows on or after report date with eager instrument loading
        List<CashFlow> cashFlows = cashFlowRepository.findAllWithInstrumentByDueDateGreaterThanEqual(reportDate);
        logger.info("Found {} cash flows on or after {}", cashFlows.size(), reportDate);

        // Assign buckets in-memory (don't persist)
        for (CashFlow cf : cashFlows) {
            long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(reportDate, cf.getDueDate());
            if (daysDiff < 0) daysDiff = 0;
            for (TimeBucket b : buckets) {
                if (b.contains(daysDiff)) {
                    cf.setBucket(b);
                    break;
                }
            }
        }

        // Aggregate per bucket
        Map<Long, BigDecimal> assetsMap = new HashMap<>();
        Map<Long, BigDecimal> liabilitiesMap = new HashMap<>();

        for (TimeBucket b : buckets) {
            assetsMap.put(b.getId(), BigDecimal.ZERO);
            liabilitiesMap.put(b.getId(), BigDecimal.ZERO);
        }

        for (CashFlow cf : cashFlows) {
            if (cf.getBucket() == null) continue;
            Long bid = cf.getBucket().getId();
            BigDecimal amount = cf.getTotalAmount();

            if (!assetsMap.containsKey(bid)) continue;

            if (cf.getInstrument().getInstrumentType() == InstrumentType.ASSET) {
                assetsMap.put(bid, assetsMap.get(bid).add(amount));
            } else {
                liabilitiesMap.put(bid, liabilitiesMap.get(bid).add(amount));
            }
        }

        // Compute gaps sequentially
        List<GapReportResponse> results = new ArrayList<>();
        BigDecimal cumulativeGap = BigDecimal.ZERO;
        BigDecimal totalAllAssets = assetsMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        for (TimeBucket b : buckets) {
            BigDecimal assets = assetsMap.get(b.getId());
            BigDecimal liabilities = liabilitiesMap.get(b.getId());
            BigDecimal gap = assets.subtract(liabilities);
            cumulativeGap = cumulativeGap.add(gap);

            BigDecimal ratio = BigDecimal.ZERO;
            if (totalAllAssets.compareTo(BigDecimal.ZERO) > 0) {
                ratio = cumulativeGap.divide(totalAllAssets, 6, RoundingMode.HALF_UP);
            }

            results.add(GapReportResponse.builder()
                    .id((long) b.getSortOrder())
                    .reportDate(reportDate)
                    .bucketId(b.getId())
                    .bucketLabel(b.getLabel())
                    .sortOrder(b.getSortOrder())
                    .totalAssets(assets)
                    .totalLiabilities(liabilities)
                    .gap(gap)
                    .cumulativeGap(cumulativeGap)
                    .gapRatio(ratio)
                    .build());
        }

        logger.info("Gap report computed: {} buckets, total assets={}, total liabilities={}", 
                results.size(), totalAllAssets, 
                liabilitiesMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));

        return results;
    }

    @Transactional(readOnly = true)
    public List<LocalDate> getAvailableReportDates() {
        return gapReportRepository.findDistinctReportDates();
    }
}
