package com.risklens.repository;

import com.risklens.domain.TimeBucket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimeBucketRepository extends JpaRepository<TimeBucket, Long> {
    List<TimeBucket> findAllByOrderBySortOrderAsc();
}
