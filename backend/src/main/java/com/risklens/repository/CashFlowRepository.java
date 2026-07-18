package com.risklens.repository;

import com.risklens.domain.CashFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CashFlowRepository extends JpaRepository<CashFlow, Long> {
    List<CashFlow> findByInstrumentId(Long instrumentId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM CashFlow c WHERE c.instrument.id = :instrumentId")
    void deleteByInstrumentId(@Param("instrumentId") Long instrumentId);

    List<CashFlow> findByDueDateBetween(LocalDate startDate, LocalDate endDate);

    List<CashFlow> findByDueDateGreaterThanEqual(LocalDate asOfDate);

    @Query("SELECT cf FROM CashFlow cf JOIN FETCH cf.instrument LEFT JOIN FETCH cf.bucket WHERE cf.dueDate >= :asOfDate")
    List<CashFlow> findAllWithInstrumentByDueDateGreaterThanEqual(@Param("asOfDate") LocalDate asOfDate);
}
