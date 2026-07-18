package com.risklens.dto;

import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.domain.enums.ProductType;
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
public class InstrumentResponse {
    private Long id;
    private InstrumentType instrumentType;
    private ProductType productType;
    private Long counterpartyId;
    private String counterpartyName;
    private BigDecimal principalAmount;
    private String currency;
    private BigDecimal interestRate;
    private LocalDate originationDate;
    private LocalDate maturityDate;
    private CashFlowFrequency cashFlowFrequency;
    private Boolean isFloatingRate;
    private String createdByEmail;
}
