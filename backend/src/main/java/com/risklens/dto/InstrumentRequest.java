package com.risklens.dto;

import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.domain.enums.ProductType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstrumentRequest {

    @NotNull(message = "Instrument type is required (ASSET or LIABILITY)")
    private InstrumentType instrumentType;

    @NotNull(message = "Product type is required")
    private ProductType productType;

    @NotNull(message = "Counterparty ID is required")
    private Long counterpartyId;

    @NotNull(message = "Principal amount is required")
    @Positive(message = "Principal amount must be positive")
    private BigDecimal principalAmount;

    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be a 3-letter code (e.g. INR)")
    private String currency;

    @NotNull(message = "Interest rate is required")
    @DecimalMin(value = "0.0", message = "Interest rate cannot be negative")
    private BigDecimal interestRate;

    @NotNull(message = "Origination date is required")
    private LocalDate originationDate;

    @NotNull(message = "Maturity date is required")
    private LocalDate maturityDate;

    @NotNull(message = "Cash flow frequency is required")
    private CashFlowFrequency cashFlowFrequency;

    private Boolean isFloatingRate = false;
}
