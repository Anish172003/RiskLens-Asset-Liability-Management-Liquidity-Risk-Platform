package com.risklens.service;

import com.risklens.domain.CashFlow;
import com.risklens.domain.Instrument;
import com.risklens.domain.TimeBucket;
import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.domain.enums.CashFlowStatus;
import com.risklens.domain.enums.ProductType;
import com.risklens.dto.CashFlowResponse;
import com.risklens.repository.CashFlowRepository;
import com.risklens.repository.TimeBucketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CashFlowService {

    private final CashFlowRepository cashFlowRepository;
    private final TimeBucketRepository timeBucketRepository;

    public CashFlowService(CashFlowRepository cashFlowRepository, TimeBucketRepository timeBucketRepository) {
        this.cashFlowRepository = cashFlowRepository;
        this.timeBucketRepository = timeBucketRepository;
    }

    @Transactional
    public void generateAndSaveCashFlows(Instrument instrument) {
        // Clear existing cash flows first
        cashFlowRepository.deleteByInstrumentId(instrument.getId());

        List<CashFlow> cashFlows = generateProjectedCashFlows(instrument);
        assignBuckets(cashFlows, LocalDate.now());
        cashFlowRepository.saveAll(cashFlows);
    }

    @Transactional(readOnly = true)
    public List<CashFlowResponse> getCashFlowsByInstrument(Long instrumentId) {
        return cashFlowRepository.findByInstrumentId(instrumentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateAllCashFlowBuckets(LocalDate asOfDate) {
        List<CashFlow> allCashFlows = cashFlowRepository.findAll();
        assignBuckets(allCashFlows, asOfDate);
        cashFlowRepository.saveAll(allCashFlows);
    }

    public List<CashFlow> generateProjectedCashFlows(Instrument instrument) {
        List<CashFlow> cashFlows = new ArrayList<>();

        LocalDate start = instrument.getOriginationDate();
        LocalDate end = instrument.getMaturityDate();
        BigDecimal principal = instrument.getPrincipalAmount();
        BigDecimal rate = instrument.getInterestRate().divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        CashFlowFrequency freq = instrument.getCashFlowFrequency();

        if (freq == CashFlowFrequency.BULLET) {
            // Single repayment at maturity
            long days = ChronoUnit.DAYS.between(start, end);
            BigDecimal interest = principal.multiply(rate)
                    .multiply(BigDecimal.valueOf(days))
                    .divide(BigDecimal.valueOf(365), 2, RoundingMode.HALF_UP);

            cashFlows.add(CashFlow.builder()
                    .instrument(instrument)
                    .dueDate(end)
                    .principalAmount(principal)
                    .interestAmount(interest)
                    .status(CashFlowStatus.PROJECTED)
                    .build());
            return cashFlows;
        }

        // Periodic schedule
        List<LocalDate> paymentDates = getPaymentDates(start, end, freq);
        int periods = paymentDates.size();
        if (periods == 0) {
            // Fallback to bullet if periods are too short
            cashFlows.add(CashFlow.builder()
                    .instrument(instrument)
                    .dueDate(end)
                    .principalAmount(principal)
                    .interestAmount(BigDecimal.ZERO)
                    .status(CashFlowStatus.PROJECTED)
                    .build());
            return cashFlows;
        }

        // Determine repayment type: LOAN is amortizing, others are bullet principal
        boolean isAmortizing = instrument.getProductType() == ProductType.LOAN;
        BigDecimal periodicPrincipal = isAmortizing 
                ? principal.divide(BigDecimal.valueOf(periods), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal remainingPrincipal = principal;
        LocalDate prevDate = start;

        for (int i = 0; i < periods; i++) {
            LocalDate nextDate = paymentDates.get(i);
            long days = ChronoUnit.DAYS.between(prevDate, nextDate);

            // Interest = remaining principal * rate * (days / 365)
            BigDecimal interest = remainingPrincipal.multiply(rate)
                    .multiply(BigDecimal.valueOf(days))
                    .divide(BigDecimal.valueOf(365), 2, RoundingMode.HALF_UP);

            BigDecimal principalPaid = periodicPrincipal;
            if (i == periods - 1) {
                // Adjust for last period to avoid rounding errors
                principalPaid = remainingPrincipal;
            }

            cashFlows.add(CashFlow.builder()
                    .instrument(instrument)
                    .dueDate(nextDate)
                    .principalAmount(principalPaid)
                    .interestAmount(interest)
                    .status(CashFlowStatus.PROJECTED)
                    .build());

            remainingPrincipal = remainingPrincipal.subtract(principalPaid);
            prevDate = nextDate;
        }

        return cashFlows;
    }

    private List<LocalDate> getPaymentDates(LocalDate start, LocalDate end, CashFlowFrequency freq) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate current = start;

        int monthsStep = switch (freq) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMI_ANNUAL -> 6;
            case ANNUAL -> 12;
            default -> 0;
        };

        if (monthsStep == 0) return dates;

        while (true) {
            current = current.plusMonths(monthsStep);
            if (current.isAfter(end) || current.isEqual(end)) {
                dates.add(end);
                break;
            }
            dates.add(current);
        }

        return dates;
    }

    public void assignBuckets(List<CashFlow> cashFlows, LocalDate asOfDate) {
        List<TimeBucket> buckets = timeBucketRepository.findAllByOrderBySortOrderAsc();

        for (CashFlow cf : cashFlows) {
            long daysDiff = ChronoUnit.DAYS.between(asOfDate, cf.getDueDate());
            
            // If due date is in the past, assign to the first bucket (0-7d) or handle it
            if (daysDiff < 0) {
                daysDiff = 0; // Default past due to the first bucket
            }

            TimeBucket assigned = null;
            for (TimeBucket b : buckets) {
                if (b.contains(daysDiff)) {
                    assigned = b;
                    break;
                }
            }
            cf.setBucket(assigned);
        }
    }

    private CashFlowResponse mapToResponse(CashFlow cf) {
        return CashFlowResponse.builder()
                .id(cf.getId())
                .instrumentId(cf.getInstrument().getId())
                .dueDate(cf.getDueDate())
                .principalAmount(cf.getPrincipalAmount())
                .interestAmount(cf.getInterestAmount())
                .totalAmount(cf.getTotalAmount())
                .bucketLabel(cf.getBucket() != null ? cf.getBucket().getLabel() : "UNBUCKETED")
                .status(cf.getStatus())
                .build();
    }
}
