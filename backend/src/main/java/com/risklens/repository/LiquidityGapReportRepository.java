package com.risklens.repository;

import com.risklens.domain.LiquidityGapReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LiquidityGapReportRepository extends JpaRepository<LiquidityGapReport, Long> {
    List<LiquidityGapReport> findByReportDateOrderByBucketSortOrderAsc(LocalDate reportDate);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM LiquidityGapReport r WHERE r.reportDate = :reportDate")
    void deleteByReportDate(@Param("reportDate") LocalDate reportDate);

    @Query("SELECT DISTINCT r.reportDate FROM LiquidityGapReport r ORDER BY r.reportDate DESC")
    List<LocalDate> findDistinctReportDates();
}

