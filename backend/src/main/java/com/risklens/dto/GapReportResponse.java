package com.risklens.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GapReportResponse {
    private Long id;
    private LocalDate reportDate;
    private Long bucketId;
    private String bucketLabel;
    private Integer sortOrder;
    private BigDecimal totalAssets;
    private BigDecimal totalLiabilities;
    private BigDecimal gap;
    private BigDecimal cumulativeGap;
    private BigDecimal gapRatio;
}
