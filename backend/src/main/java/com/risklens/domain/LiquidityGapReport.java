package com.risklens.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "liquidity_gap_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiquidityGapReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bucket_id", nullable = false)
    private TimeBucket bucket;

    @Column(name = "total_assets", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAssets;

    @Column(name = "total_liabilities", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalLiabilities;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal gap;

    @Column(name = "cumulative_gap", nullable = false, precision = 18, scale = 2)
    private BigDecimal cumulativeGap;

    @Column(name = "gap_ratio", precision = 10, scale = 6)
    private BigDecimal gapRatio;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
