package com.risklens.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "time_buckets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeBucket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String label;

    @Column(name = "sort_order", nullable = false, unique = true)
    private Integer sortOrder;

    @Column(name = "min_days", nullable = false)
    private Integer minDays;

    @Column(name = "max_days")
    private Integer maxDays;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Check if a given number of days falls within this bucket.
     * max_days is exclusive upper bound; NULL means infinity (open-ended).
     */
    public boolean contains(long daysDiff) {
        if (daysDiff < minDays) return false;
        if (maxDays == null) return true;
        return daysDiff < maxDays;
    }
}
