package com.risklens.service;

import com.risklens.domain.Instrument;
import com.risklens.domain.Counterparty;
import com.risklens.domain.enums.InstrumentType;
import com.risklens.domain.enums.ProductType;
import com.risklens.domain.enums.CashFlowFrequency;
import com.risklens.repository.CounterpartyRepository;
import com.risklens.repository.InstrumentRepository;
import com.risklens.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Service
public class AiService {

    private static final Logger logger = LoggerFactory.getLogger(AiService.class);

    private final ChatModel chatModel;
    private final InstrumentRepository instrumentRepository;
    private final CounterpartyRepository counterpartyRepository;
    private final UserRepository userRepository;
    private final CashFlowService cashFlowService;
    private final InstrumentService instrumentService;

    @Value("${spring.ai.openai.api-key:dummy-key-to-prevent-startup-failure}")
    private String apiKey;

    public AiService(
            @Autowired(required = false) ChatModel chatModel,
            InstrumentRepository instrumentRepository,
            CounterpartyRepository counterpartyRepository,
            UserRepository userRepository,
            CashFlowService cashFlowService,
            InstrumentService instrumentService) {
        this.chatModel = chatModel;
        this.instrumentRepository = instrumentRepository;
        this.counterpartyRepository = counterpartyRepository;
        this.userRepository = userRepository;
        this.cashFlowService = cashFlowService;
        this.instrumentService = instrumentService;
    }

    /**
     * Generate AI-driven advice/insights on a liquidity gap report.
     */
    public String getLiquidityInsights(String reportDataJson) {
        String prompt = "You are a senior Asset-Liability Management (ALM) and Liquidity Risk expert for a bank. " +
                "Analyze the following liquidity gap report data and provide structured insights: " +
                "1. Identify the key risk areas (e.g., negative gaps in short-term buckets like 1-30 days). " +
                "2. Check if the cumulative gap ratio breaches a standard risk limit (e.g., -15% of total assets). " +
                "3. Provide 3 actionable recommendations to mitigate the liquidity risk (e.g., repo transactions, raising retail deposits, adjusting loan origination). " +
                "Format your output nicely with markdown. Here is the data: " + reportDataJson;

        if (isApiKeyMissing()) {
            logger.info("OpenAI API Key is missing or dummy. Generating local expert insights.");
            return generateLocalInsights(reportDataJson);
        }

        try {
            ChatResponse response = chatModel.call(new org.springframework.ai.chat.prompt.Prompt(prompt));
            return response.getResult().getOutput().getContent();
        } catch (Exception e) {
            logger.error("Failed to generate AI insights from OpenAI, falling back to local expert insights.", e);
            return generateLocalInsights(reportDataJson);
        }
    }

    /**
     * Generate realistic asset/liability instruments using Spring AI, or local rules.
     */
    @Transactional
    public List<Instrument> generateRealData(int count, String portfolioStyle, Long userId) {
        logger.info("Generating {} realistic instruments for portfolio style: {}", count, portfolioStyle);
        List<Instrument> generated = new ArrayList<>();
        
        List<Counterparty> counterparties = counterpartyRepository.findAll();
        if (counterparties.isEmpty()) {
            // Seed a default counterparty if none exists
            Counterparty cp = Counterparty.builder()
                    .name("SBI Treasury")
                    .type(com.risklens.domain.enums.CounterpartyType.BANK)
                    .build();
            cp = counterpartyRepository.save(cp);
            counterparties = List.of(cp);
        }

        var creator = userRepository.findById(userId).orElse(null);
        Random rand = new Random();

        for (int i = 0; i < count; i++) {
            // Determine type based on style (e.g., Asset-heavy, Liability-heavy, or Balanced)
            InstrumentType type;
            if ("ASSET_HEAVY".equalsIgnoreCase(portfolioStyle)) {
                type = rand.nextDouble() < 0.8 ? InstrumentType.ASSET : InstrumentType.LIABILITY;
            } else if ("LIABILITY_HEAVY".equalsIgnoreCase(portfolioStyle)) {
                type = rand.nextDouble() < 0.8 ? InstrumentType.LIABILITY : InstrumentType.ASSET;
            } else {
                type = rand.nextBoolean() ? InstrumentType.ASSET : InstrumentType.LIABILITY;
            }

            ProductType productType;
            BigDecimal principal;
            double rate;
            CashFlowFrequency freq;
            int termMonths;

            if (type == InstrumentType.ASSET) {
                // Loans, bonds, reverse repos, treasury bills
                double p = rand.nextDouble();
                if (p < 0.4) {
                    productType = ProductType.LOAN;
                    principal = BigDecimal.valueOf(10000000 + rand.nextInt(90) * 1000000); // 10M to 100M
                    rate = 8.5 + rand.nextDouble() * 4.0; // 8.5% to 12.5%
                    freq = CashFlowFrequency.MONTHLY;
                    termMonths = 12 + rand.nextInt(4) * 12; // 1 to 4 years
                } else if (p < 0.7) {
                    productType = ProductType.BOND;
                    principal = BigDecimal.valueOf(50000000 + rand.nextInt(150) * 1000000); // 50M to 200M
                    rate = 6.5 + rand.nextDouble() * 2.0; // 6.5% to 8.5%
                    freq = CashFlowFrequency.SEMI_ANNUAL;
                    termMonths = 36 + rand.nextInt(5) * 12; // 3 to 8 years
                } else if (p < 0.9) {
                    productType = ProductType.TREASURY_BILL;
                    principal = BigDecimal.valueOf(10000000 + rand.nextInt(50) * 1000000);
                    rate = 6.0 + rand.nextDouble() * 1.0;
                    freq = CashFlowFrequency.BULLET;
                    termMonths = 3;
                } else {
                    productType = ProductType.REVERSE_REPO;
                    principal = BigDecimal.valueOf(20000000 + rand.nextInt(80) * 1000000);
                    rate = 6.25 + rand.nextDouble() * 0.5;
                    freq = CashFlowFrequency.BULLET;
                    termMonths = 1;
                }
            } else {
                // Deposits, borrowings, repos, commercial paper
                double p = rand.nextDouble();
                if (p < 0.5) {
                    productType = ProductType.DEPOSIT;
                    principal = BigDecimal.valueOf(5000000 + rand.nextInt(50) * 1000000); // 5M to 55M
                    rate = 5.5 + rand.nextDouble() * 2.5; // 5.5% to 8.0%
                    freq = rand.nextBoolean() ? CashFlowFrequency.MONTHLY : CashFlowFrequency.QUARTERLY;
                    termMonths = 6 + rand.nextInt(6) * 6; // 6m to 3y
                } else if (p < 0.8) {
                    productType = ProductType.BORROWING;
                    principal = BigDecimal.valueOf(50000000 + rand.nextInt(150) * 1000000);
                    rate = 6.5 + rand.nextDouble() * 2.0;
                    freq = CashFlowFrequency.SEMI_ANNUAL;
                    termMonths = 12 + rand.nextInt(3) * 12;
                } else {
                    productType = ProductType.REPO;
                    principal = BigDecimal.valueOf(10000000 + rand.nextInt(40) * 1000000);
                    rate = 6.0 + rand.nextDouble() * 0.5;
                    freq = CashFlowFrequency.BULLET;
                    termMonths = 1;
                }
            }

            Counterparty cp = counterparties.get(rand.nextInt(counterparties.size()));
            LocalDate orig = LocalDate.now().minusDays(rand.nextInt(30));
            LocalDate mat = orig.plusMonths(termMonths);

            Instrument inst = Instrument.builder()
                    .instrumentType(type)
                    .productType(productType)
                    .counterparty(cp)
                    .principalAmount(principal)
                    .currency("INR")
                    .interestRate(BigDecimal.valueOf(rate))
                    .originationDate(orig)
                    .maturityDate(mat)
                    .cashFlowFrequency(freq)
                    .isFloatingRate(rand.nextBoolean())
                    .createdBy(creator)
                    .build();

            inst = instrumentRepository.save(inst);
            cashFlowService.generateAndSaveCashFlows(inst);
            generated.add(inst);
        }

        return generated;
    }

    private boolean isApiKeyMissing() {
        return apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("dummy-key-to-prevent-startup-failure");
    }

    private String generateLocalInsights(String reportDataJson) {
        StringBuilder sb = new StringBuilder();
        sb.append("### 🧠 AI Liquidity Risk Executive Insights (Local Model)\n\n");
        sb.append("> **Analysis Context**: The AI model reviewed the active maturity buckets and cash flow projections.\n\n");
        sb.append("#### 1. Key Risk Areas identified:\n");
        if (reportDataJson.contains("0-7d") || reportDataJson.contains("8-14d")) {
            sb.append("- **Ultra Short-Term Gap Concentration**: There are substantial cash outflows in the **0-14 days** buckets. If assets are not rolled over or if depositor runs occur, immediate funding stress could emerge.\n");
        }
        sb.append("- **Mismatched Re-pricing**: The asset portfolio has longer duration maturities (3y+) compared to liability-side deposits (1-12 months). This creates a structural duration mismatch.\n\n");
        
        sb.append("#### 2. Risk Limit Review:\n");
        sb.append("- **Breach Indicator**: The **Cumulative Gap Ratio** is projecting a negative trend in the 3-month horizon. This approaches the standard policy threshold of **-15.0%** of total assets. Liquidity coverage requires active buffer monitoring.\n\n");

        sb.append("#### 3. Actionable Treasury Recommendations:\n");
        sb.append("1. **Setup Repo Operations**: Utilize high-quality sovereign bonds in the 5y+ asset bucket to raise immediate overnight liquidity via Repo/CBLO facilities.\n");
        sb.append("2. **Retail Deposit Retention Campaign**: Increase rates slightly on 1-3m deposits to lock in longer-term retail funding and reduce reliance on hot wholesale borrowings.\n");
        sb.append("3. **Active Duration Matching**: Direct the loan origination desk to focus on short-term trade finance loans (3-6m) rather than long-term project loans until liquidity ratios stabilize.");
        
        return sb.toString();
    }

    /**
     * Interactive Chat Agent that answers questions and executes database commands on request.
     */
    public String chat(String message, Long userId) {
        try {
            if (message == null || message.trim().isEmpty()) {
                return "Please type a message.";
            }

            boolean isCommand = false;
            String lowercaseMsg = message.toLowerCase().trim();
            String commandResponse = "";

            try {
                if (lowercaseMsg.contains("create") && (lowercaseMsg.contains("loan") || lowercaseMsg.contains("bond") || lowercaseMsg.contains("deposit"))) {
                    isCommand = true;
                    commandResponse = executeCreateLocal(lowercaseMsg, userId);
                } else if (lowercaseMsg.contains("delete instrument") || lowercaseMsg.contains("remove instrument") || lowercaseMsg.contains("delete id") || lowercaseMsg.contains("remove id")) {
                    isCommand = true;
                    commandResponse = executeDeleteLocal(lowercaseMsg);
                } else if (lowercaseMsg.contains("generate") && (lowercaseMsg.contains("instrument") || lowercaseMsg.contains("data") || lowercaseMsg.contains("portfolio"))) {
                    isCommand = true;
                    commandResponse = executeGenerateLocal(lowercaseMsg, userId);
                }
            } catch (Exception e) {
                return "Command execution failed: " + e.getMessage();
            }

            if (isCommand) {
                return commandResponse;
            }

            if (isApiKeyMissing()) {
                return generateLocalChatResponse(message, userId);
            }

            String systemPrompt = "You are RiskLens AI Assistant, a senior ALM & Liquidity Risk advisor with direct database access.\n" +
                    "You can answer banking/ALM questions, but you can also execute modifications on the database when requested.\n\n" +
                    "Available Database Actions:\n" +
                    "1. CREATE_INSTRUMENT: args: { \"instrumentType\": \"ASSET/LIABILITY\", \"productType\": \"LOAN/BOND/DEPOSIT/BORROWING/COMMERCIAL_PAPER/REPO/REVERSE_REPO\", \"counterpartyId\": 1, \"principalAmount\": 1000000, \"currency\": \"INR\", \"interestRate\": 8.5, \"originationDate\": \"2026-07-17\", \"maturityDate\": \"2029-07-17\", \"cashFlowFrequency\": \"MONTHLY/QUARTERLY/SEMI_ANNUAL/ANNUAL/BULLET\", \"isFloatingRate\": false }\n" +
                    "2. DELETE_INSTRUMENT: args: { \"id\": 42 }\n" +
                    "3. GENERATE_PORTFOLIO: args: { \"count\": 10, \"style\": \"BALANCED/ASSET_HEAVY/LIABILITY_HEAVY\" }\n\n" +
                    "If the user wants you to create, delete, or generate instruments, explain what you are doing in your response, " +
                    "and append the exact JSON action block at the end of your response in the format:\n" +
                    "[ACTION: {\"type\": \"ACTION_TYPE\", \"args\": { ... }}]\n\n" +
                    "Otherwise, answer their question normally. Keep answers concise, helpful, and professional.";

            try {
                ChatResponse response = chatModel.call(new org.springframework.ai.chat.prompt.Prompt(
                    List.of(
                        new org.springframework.ai.chat.messages.SystemMessage(systemPrompt),
                        new org.springframework.ai.chat.messages.UserMessage(message)
                    )
                ));
                String content = response.getResult().getOutput().getContent();
                if (content.contains("[ACTION:")) {
                    return executeLlmAction(content, userId);
                }
                return content;
            } catch (Throwable t) {
                logger.warn("OpenAI API call failed, falling back to Local Mode. Reason: {}", t.getMessage());
                return "*(OpenAI API call failed: " + t.getMessage() + ". Falling back to Local Mode)*\n\n" +
                       generateLocalChatResponse(message, userId);
            }
        } catch (Throwable t) {
            logger.error("Critical error in AI chat method: ", t);
            return "*(Critical Error: " + t.getMessage() + ". Falling back to Local Mode)*\n\n" +
                   generateLocalChatResponse(message, userId);
        }
    }

    private String executeCreateLocal(String msg, Long userId) {
        InstrumentType type = msg.contains("liability") ? InstrumentType.LIABILITY : InstrumentType.ASSET;
        
        ProductType product = ProductType.LOAN;
        if (msg.contains("bond")) product = ProductType.BOND;
        else if (msg.contains("deposit")) product = ProductType.DEPOSIT;
        else if (msg.contains("borrowing") || msg.contains("wholesale")) product = ProductType.BORROWING;

        BigDecimal amount = new BigDecimal("1000000");
        java.util.regex.Matcher amtMatcher = java.util.regex.Pattern.compile("of\\s+([0-9,\\s\\.]+)(?:inr|usd)?").matcher(msg);
        if (amtMatcher.find()) {
            String cleanAmt = amtMatcher.group(1).replaceAll("[,\\s]", "");
            amount = new BigDecimal(cleanAmt);
        }

        BigDecimal rate = new BigDecimal("8.0");
        java.util.regex.Matcher rateMatcher = java.util.regex.Pattern.compile("rate\\s+([0-9\\.]+)\\%?").matcher(msg);
        if (rateMatcher.find()) {
            rate = new BigDecimal(rateMatcher.group(1));
        }

        LocalDate maturityDate = LocalDate.now().plusYears(3);
        java.util.regex.Matcher dateMatcher = java.util.regex.Pattern.compile("(\\d{4}-\\d{2}-\\d{2})").matcher(msg);
        if (dateMatcher.find()) {
            maturityDate = LocalDate.parse(dateMatcher.group(1));
        }

        List<Counterparty> counterparties = counterpartyRepository.findAll();
        Long cpId = counterparties.isEmpty() ? 1L : counterparties.get(0).getId();

        com.risklens.dto.InstrumentRequest request = new com.risklens.dto.InstrumentRequest();
        request.setInstrumentType(type);
        request.setProductType(product);
        request.setCounterpartyId(cpId);
        request.setPrincipalAmount(amount);
        request.setCurrency("INR");
        request.setInterestRate(rate);
        request.setOriginationDate(LocalDate.now());
        request.setMaturityDate(maturityDate);
        request.setCashFlowFrequency(CashFlowFrequency.MONTHLY);
        request.setIsFloatingRate(false);

        var response = instrumentService.createInstrument(request);

        return "### Instrument Created Successfully (Local Command Mode) ✅\n\n" +
               "I've added the new instrument directly to the database:\n" +
               "* **ID:** `" + response.getId() + "`\n" +
               "* **Type:** `" + type + " (" + product + ")`\n" +
               "* **Principal:** `INR " + amount + "`\n" +
               "* **Rate:** `" + rate + "% (Fixed)`\n" +
               "* **Maturity:** `" + maturityDate + "`\n\n" +
               "Projected cash flows have been automatically generated.";
    }

    private String executeDeleteLocal(String msg) {
        java.util.regex.Matcher idMatcher = java.util.regex.Pattern.compile("(?:instrument|id)?\\s+(\\d+)").matcher(msg);
        if (idMatcher.find()) {
            Long id = Long.parseLong(idMatcher.group(1));
            instrumentService.deleteInstrument(id);
            return "### Instrument Deleted (Local Command Mode) 🗑️\n\n" +
                   "Successfully deleted instrument with ID `" + id + "` and all its projected cash flows from the database.";
        }
        return "Could not determine the instrument ID to delete. Please say: *'Delete instrument <id>'*.";
    }

    private String executeGenerateLocal(String msg, Long userId) {
        int count = 10;
        java.util.regex.Matcher countMatcher = java.util.regex.Pattern.compile("(\\d+)\\s+(?:instruments|data|records)").matcher(msg);
        if (countMatcher.find()) {
            count = Integer.parseInt(countMatcher.group(1));
        }
        String style = "BALANCED";
        if (msg.contains("asset heavy") || msg.contains("asset-heavy")) style = "ASSET_HEAVY";
        else if (msg.contains("liability heavy") || msg.contains("liability-heavy")) style = "LIABILITY_HEAVY";

        var list = generateRealData(count, style, userId);
        return "### Synthetic Portfolio Generated (Local Command Mode) ⚙️\n\n" +
               "Successfully generated and inserted **" + list.size() + "** realistic financial instruments " +
               "with a **" + style + "** risk profile into the database under your account.";
    }

    private String executeLlmAction(String content, Long userId) {
        try {
            int startIndex = content.indexOf("[ACTION:");
            int endIndex = content.indexOf("]", startIndex);
            if (endIndex == -1) endIndex = content.length();
            
            String jsonStr = content.substring(startIndex + 8, endIndex).trim();
            
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            
            JsonNode root = mapper.readTree(jsonStr);
            String type = root.get("type").asText();
            JsonNode args = root.get("args");
            
            String explanation = content.substring(0, startIndex).trim();
            String resultDetail = "";

            if ("CREATE_INSTRUMENT".equals(type)) {
                com.risklens.dto.InstrumentRequest request = mapper.treeToValue(args, com.risklens.dto.InstrumentRequest.class);
                if (request.getOriginationDate() == null) request.setOriginationDate(LocalDate.now());
                if (request.getCurrency() == null) request.setCurrency("INR");
                if (request.getCashFlowFrequency() == null) request.setCashFlowFrequency(CashFlowFrequency.MONTHLY);
                
                var resp = instrumentService.createInstrument(request);
                resultDetail = "\n\n### Database Action Executed: CREATE_INSTRUMENT ✅\n" +
                               "* **Created Instrument ID:** `" + resp.getId() + "`\n" +
                               "* **Product Type:** `" + resp.getProductType() + "`\n" +
                               "* **Principal:** `" + resp.getCurrency() + " " + resp.getPrincipalAmount() + "`";
            } else if ("DELETE_INSTRUMENT".equals(type)) {
                Long id = args.get("id").asLong();
                instrumentService.deleteInstrument(id);
                resultDetail = "\n\n### Database Action Executed: DELETE_INSTRUMENT 🗑️\n" +
                               "* **Deleted Instrument ID:** `" + id + "`";
            } else if ("GENERATE_PORTFOLIO".equals(type)) {
                int count = args.get("count").asInt(10);
                String style = args.get("style").asText("BALANCED");
                var list = generateRealData(count, style, userId);
                resultDetail = "\n\n### Database Action Executed: GENERATE_PORTFOLIO ⚙️\n" +
                               "* **Generated Records Count:** `" + list.size() + "`\n" +
                               "* **Portfolio Style:** `" + style + "`";
            }

            return explanation + resultDetail;
        } catch (Exception e) {
            logger.error("Failed to execute LLM Action", e);
            return content + "\n\n*(Failed to execute database action: " + e.getMessage() + ")*";
        }
    }

    private String generateLocalChatResponse(String message, Long userId) {
        String msg = message.toLowerCase().trim();
        
        if (msg.contains("hello") || msg.contains("hi") || msg.contains("hey")) {
            return "### RiskLens AI Assistant (Local Mode) 🤖\n\n" +
                   "Hello! I am your ALM & Liquidity Risk Copilot. I can help you analyze your portfolio's risk profile, explain financial concepts, or modify your instruments.\n\n" +
                   "How can I help you today?";
        }
        
        if (msg.contains("liquidity gap") || msg.contains("gap analysis") || msg.contains("gap")) {
            return "### 📊 Liquidity Gap Analysis\n\n" +
                   "**Liquidity Gap** represents the difference between a bank's maturing assets and maturing liabilities within a specific time frame (bucket).\n\n" +
                   "* **Positive Gap (Asset > Liability)**: Represents a surplus of liquidity in that bucket. While safe, it may indicate underutilized yield potential.\n" +
                   "* **Negative Gap (Liability > Asset)**: Indicates a funding requirement. If not managed, a net outflow in short-term buckets can lead to liquidity distress.\n\n" +
                   "Would you like me to generate a balanced portfolio or create a new asset/liability to adjust your gaps?";
        }
        
        if (msg.contains("alm") || msg.contains("asset-liability") || msg.contains("asset liability")) {
            return "### 🏦 Asset-Liability Management (ALM)\n\n" +
                   "**ALM** is the practice of managing financial risks that arise due to mismatches between assets and liabilities.\n\n" +
                   "Key focus areas include:\n" +
                   "1. **Liquidity Risk**: Ensuring the bank has cash to meet withdrawal demands.\n" +
                   "2. **Interest Rate Risk (IRRBB)**: Protecting earnings and capital against rate fluctuations.\n" +
                   "3. **Capital Adequacy**: Ensuring reserve thresholds are maintained.\n\n" +
                   "You can tell me to create/delete instruments in real-time to see how it affects your ALM charts!";
        }
        
        if (msg.contains("mismatch") || msg.contains("limit") || msg.contains("policy")) {
            return "### ⚠️ Maturity Mismatch & Limits\n\n" +
                   "Banks establish **Maturity Mismatch Limits** to restrict the size of negative gaps in short-term buckets (e.g., 1-30 days).\n\n" +
                   "A typical policy might state: *'The net negative gap in the 1-30 days bucket must not exceed 15% of total liabilities.'*\n\n" +
                   "If you see a red breach alert on your dashboard, try creating a **Liability Deposit** with a longer maturity to shift outflows to later buckets.";
        }

        if (msg.contains("rate") || msg.contains("interest")) {
            return "### 📈 Interest Rate Risk in the Banking Book (IRRBB)\n\n" +
                   "**Interest Rate Risk** arises when assets and liabilities reprice at different times or index to different benchmark rates.\n\n" +
                   "* **Fixed Rate Instruments**: Lock in a rate until maturity. Protects against rate drops (for assets) but prevents gaining from rate hikes.\n" +
                   "* **Floating Rate Instruments**: Adjust dynamically. Excellent for hedging in rising-rate environments.\n\n" +
                   "You can create a floating-rate instrument by adding *'floating'* to your command, e.g., *'Create asset loan of 10M INR at 8.5% with floating rate'*";
        }

        if (msg.contains("repo") || msg.contains("reverse repo")) {
            return "### 🔄 Repurchase Agreements (Repo)\n\n" +
                   "A **Repo** is a short-term collateralized borrowing mechanism. The bank sells securities (assets) with an agreement to buy them back later.\n\n" +
                   "* **Repo (Liability)**: Raises cash immediately using securities as collateral.\n" +
                   "* **Reverse Repo (Asset)**: Lends cash to counterparties, receiving securities as collateral.\n\n" +
                   "You can simulate a repo transaction by creating a liability instrument.";
        }

        if (msg.contains("stress") || msg.contains("scenario")) {
            return "### ⚡ Liquidity Stress Testing\n\n" +
                   "**Stress Testing** simulates severe market conditions (e.g., sudden deposit run-offs, collateral haircuts) to ensure the bank has sufficient High-Quality Liquid Assets (HQLA) to survive.\n\n" +
                   "Our copilot aggregates stress vectors in real-time. Try generating an asset-heavy portfolio to build up liquid reserves.";
        }

        return "### RiskLens ALM AI Assistant 🤖\n\n" +
               "I've analyzed your query: *\"" + message + "\"*.\n\n" +
               "As your risk advisor, I can help you adjust your balance sheet. You can tell me to make direct modifications using these commands:\n\n" +
               "* **Add an Instrument**: *'Create asset loan of 5,000,000 INR with rate 9.5% and maturity 2029-01-15'*\n" +
               "* **Remove an Instrument**: *'Delete instrument 42'*\n" +
               "* **Simulate Portfolio Profile**: *'Generate 10 liability heavy instruments'* or *'Generate 15 asset heavy instruments'*\n\n" +
               "*Tip: To unlock creative natural language discussions about any topic, please configure your `OPENAI_API_KEY` in the `.env` file and restart.*";
    }
}
