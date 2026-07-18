package com.risklens.repository;

import com.risklens.domain.Instrument;
import com.risklens.domain.enums.InstrumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface InstrumentRepository extends JpaRepository<Instrument, Long> {

    @Query("SELECT i FROM Instrument i WHERE " +
           "(:type IS NULL OR i.instrumentType = :type) AND " +
           "(:counterpartyId IS NULL OR i.counterparty.id = :counterpartyId) AND " +
           "(:maturityStart IS NULL OR i.maturityDate >= :maturityStart) AND " +
           "(:maturityEnd IS NULL OR i.maturityDate <= :maturityEnd)")
    Page<Instrument> findFiltered(
            @Param("type") InstrumentType type,
            @Param("counterpartyId") Long counterpartyId,
            @Param("maturityStart") LocalDate maturityStart,
            @Param("maturityEnd") LocalDate maturityEnd,
            Pageable pageable
    );
}
