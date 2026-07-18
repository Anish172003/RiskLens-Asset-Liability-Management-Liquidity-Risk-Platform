package com.risklens.service;

import com.risklens.domain.Counterparty;
import com.risklens.domain.Instrument;
import com.risklens.domain.User;
import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.domain.enums.ProductType;
import com.risklens.dto.InstrumentResponse;
import com.risklens.exception.BadRequestException;
import com.risklens.repository.CounterpartyRepository;
import com.risklens.repository.InstrumentRepository;
import com.risklens.repository.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class InstrumentServiceTest {

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private CounterpartyRepository counterpartyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CashFlowService cashFlowService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private InstrumentService instrumentService;

    private SecurityContext originalContext;

    @BeforeEach
    void setUp() {
        originalContext = SecurityContextHolder.getContext();
        
        SecurityContext mockContext = mock(SecurityContext.class);
        Authentication mockAuth = mock(Authentication.class);
        when(mockContext.getAuthentication()).thenReturn(mockAuth);
        when(mockAuth.getName()).thenReturn("risk@risklens.com");
        SecurityContextHolder.setContext(mockContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.setContext(originalContext);
    }

    private byte[] createPdfWithText(String text) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                contentStream.newLineAtOffset(50, 700);
                
                String[] lines = text.split("\n");
                for (String line : lines) {
                    // PDFBox showText doesn't support newlines directly, so we draw line-by-line
                    contentStream.showText(line);
                    contentStream.newLineAtOffset(0, -12);
                }
                contentStream.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    @Test
    void testBulkUploadPdfSuccess() throws Exception {
        String pdfContent = "ASSET,LOAN,4,50000000,INR,9.5,2026-01-15,2029-01-15,MONTHLY,false\n" +
                            "LIABILITY,DEPOSIT,4,80000000,INR,6.5,2026-01-01,2027-01-01,QUARTERLY,false";
        
        byte[] pdfBytes = createPdfWithText(pdfContent);
        MockMultipartFile file = new MockMultipartFile("file", "portfolio.pdf", "application/pdf", pdfBytes);

        User mockUser = User.builder().id(1L).email("risk@risklens.com").name("Risk Manager").build();
        when(userRepository.findByEmail("risk@risklens.com")).thenReturn(Optional.of(mockUser));

        Counterparty mockCp = Counterparty.builder().id(4L).name("Retail Pool A").build();
        when(counterpartyRepository.findById(4L)).thenReturn(Optional.of(mockCp));

        Instrument savedInstrument = Instrument.builder()
                .id(99L)
                .instrumentType(InstrumentType.ASSET)
                .productType(ProductType.LOAN)
                .counterparty(mockCp)
                .principalAmount(new BigDecimal("50000000"))
                .currency("INR")
                .interestRate(new BigDecimal("9.5"))
                .originationDate(LocalDate.of(2026, 1, 15))
                .maturityDate(LocalDate.of(2029, 1, 15))
                .cashFlowFrequency(CashFlowFrequency.MONTHLY)
                .isFloatingRate(false)
                .createdBy(mockUser)
                .build();

        when(instrumentRepository.save(any(Instrument.class))).thenReturn(savedInstrument);
        when(instrumentRepository.findById(any())).thenReturn(Optional.of(savedInstrument));

        int count = instrumentService.bulkUploadPdf(file);
        assertEquals(2, count);

        verify(instrumentRepository, times(2)).save(any(Instrument.class));
        verify(cashFlowService, times(2)).generateAndSaveCashFlows(any(Instrument.class));
        verify(auditService, times(2)).log(eq("CREATE"), eq("Instrument"), any(), any());
    }

    @Test
    void testBulkUploadPdfMalformedLine() throws Exception {
        String pdfContent = "INVALID_TYPE,LOAN,4,50000000,INR,9.5,2026-01-15,2029-01-15,MONTHLY,false";
        byte[] pdfBytes = createPdfWithText(pdfContent);
        MockMultipartFile file = new MockMultipartFile("file", "portfolio.pdf", "application/pdf", pdfBytes);

        assertThrows(BadRequestException.class, () -> instrumentService.bulkUploadPdf(file));
    }
}
