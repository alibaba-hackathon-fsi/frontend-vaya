# Policy API

<cite>
**Referenced Files in This Document**
- [route.ts](file://src/app/api/policy/route.ts)
- [eligibilityRules.ts](file://src/data/eligibilityRules.ts)
- [riskRules.ts](file://src/data/riskRules.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced policy answer generation with multi-language support integration
- Improved RAG (Retrieval-Augmented Generation) logic for better policy compliance responses
- Updated policy evaluation engine to handle internationalized responses
- Added enhanced error handling for policy violations across different languages
- Integrated language detection and response formatting for global borrowers

## Table of Contents
1. [API Overview](#api-overview)
2. [HTTP POST Method Specification](#http-post-method-specification)
3. [Request Schema](#request-schema)
4. [Policy Rule Evaluation](#policy-rule-evaluation)
5. [Response Format](#response-format)
6. [Multi-Language Support](#multi-language-support)
7. [RAG Logic Integration](#rag-logic-integration)
8. [Compliance Scoring Algorithm](#compliance-scoring-algorithm)
9. [Policy Versioning](#policy-versioning)
10. [Example Scenarios](#example-scenarios)
11. [Regulatory Framework Integration](#regulatory-framework-integration)

## API Overview

The Policy API endpoint provides comprehensive policy compliance checking services for borrower eligibility assessment. The service evaluates borrower data against predefined policy rules, risk criteria, and regulatory requirements to determine loan approval status.

**Endpoint**: `POST /api/policy`
**Content-Type**: `application/json`
**Authentication**: Required (as per application security policies)

### Key Features
- Real-time policy compliance checking
- Multi-language response support
- Enhanced RAG-based policy interpretation
- Comprehensive violation reporting
- Regulatory framework integration
- Dynamic policy versioning support

## HTTP POST Method Specification

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <token>
Accept-Language: en|vi|fr|de
X-Policy-Version: v1.0.0
```

### Request Body Structure
```json
{
  "borrower": {
    "personalInfo": {
      "name": "string",
      "dateOfBirth": "YYYY-MM-DD",
      "nationality": "string",
      "language": "en|vi|fr|de"
    },
    "financialInfo": {
      "annualIncome": "number",
      "employmentStatus": "employed|self-employed|unemployed",
      "creditScore": "number",
      "existingLoans": "array"
    }
  },
  "loanDetails": {
    "amount": "number",
    "purpose": "string",
    "term": "number",
    "collateral": "object"
  },
  "policyVersion": "string",
  "includeViolations": "boolean"
}
```

### Response Codes
- `200 OK`: Policy check completed successfully
- `400 Bad Request`: Invalid request format or missing required fields
- `401 Unauthorized`: Authentication failed
- `422 Unprocessable Entity`: Policy validation errors
- `500 Internal Server Error`: Server-side processing error

**Section sources**
- [route.ts](file://src/app/api/policy/route.ts)

## Request Schema

### Borrower Information Schema
The borrower object contains personal and financial information required for policy evaluation:

#### Personal Information
- **name**: Full legal name (required)
- **dateOfBirth**: Birth date in ISO format (required)
- **nationality**: Country code (ISO 3166-1 alpha-2) (required)
- **language**: Preferred response language (default: en)

#### Financial Information
- **annualIncome**: Annual income in local currency (required)
- **employmentStatus**: Current employment status (required)
- **creditScore**: Credit score value (0-850 scale) (optional)
- **existingLoans**: Array of current loan obligations (optional)

### Loan Details Schema
- **amount**: Requested loan amount (required)
- **purpose**: Loan purpose category (required)
- **term**: Loan term in months (required)
- **collateral**: Asset details for secured loans (optional)

### Validation Rules
- All numeric fields must be positive values
- Date fields must follow ISO 8601 format
- Language codes must be supported locales
- Amounts must be within policy limits

**Section sources**
- [eligibilityRules.ts](file://src/data/eligibilityRules.ts)
- [riskRules.ts](file://src/data/riskRules.ts)

## Policy Rule Evaluation

The policy evaluation engine processes borrower data through multiple rule categories:

### Eligibility Rules
- Age requirements (minimum/maximum age)
- Income thresholds and debt-to-income ratios
- Employment duration requirements
- Credit score minimums
- Residency and nationality restrictions

### Risk Assessment Rules
- Debt-to-income ratio calculations
- Credit history analysis
- Employment stability assessment
- Collateral valuation requirements
- Industry-specific risk factors

### Regulatory Compliance Rules
- Anti-money laundering (AML) checks
- Know Your Customer (KYC) verification
- Local lending regulations compliance
- International sanctions screening
- Tax residency requirements

### Multi-Language Policy Interpretation
The enhanced system now supports policy interpretation in multiple languages, ensuring accurate compliance checking regardless of borrower location or preferred language.

**Updated** Enhanced policy evaluation now includes multi-language support and improved RAG-based policy interpretation for better accuracy across different jurisdictions.

**Section sources**
- [eligibilityRules.ts](file://src/data/eligibilityRules.ts)
- [riskRules.ts](file://src/data/riskRules.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)

## Response Format

### Success Response Structure
```json
{
  "status": "approved|rejected|pending_review",
  "complianceScore": "number",
  "policyVersion": "string",
  "timestamp": "ISO timestamp",
  "borrowerId": "string",
  "evaluationResults": {
    "eligibilityCheck": "boolean",
    "riskAssessment": "low|medium|high",
    "regulatoryCompliance": "boolean",
    "policyViolations": "array"
  },
  "recommendations": "array",
  "nextSteps": "array",
  "language": "string"
}
```

### Violation Details Structure
```json
{
  "violationId": "string",
  "ruleCategory": "string",
  "severity": "critical|major|minor",
  "description": "string",
  "localizedDescription": "object",
  "remediationSteps": "array",
  "regulatoryReference": "string"
}
```

### Error Response Structure
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "localizedMessage": "object",
    "details": "object",
    "timestamp": "ISO timestamp"
  }
}
```

### Multi-Language Response Support
All response messages, descriptions, and guidance are now available in multiple languages based on the borrower's preferred language setting.

**Section sources**
- [route.ts](file://src/app/api/policy/route.ts)

## Multi-Language Support

### Supported Languages
- **English (en)**: Default language
- **Vietnamese (vi)**: Southeast Asian market support
- **French (fr)**: European and African markets
- **German (de)**: Central European markets

### Language Detection and Processing
The enhanced system automatically detects borrower language preferences and provides localized responses throughout the policy evaluation process.

### Localization Features
- **Dynamic Content Generation**: Policy explanations and guidance are generated in the borrower's preferred language
- **Regulatory References**: Local regulatory frameworks are referenced appropriately based on borrower nationality
- **Cultural Context**: Policy interpretations consider cultural and regional differences
- **Error Messages**: All error messages and validation feedback are localized

### Language-Specific Policy Rules
Different regions may have specific policy variations that are automatically applied based on borrower nationality and residence.

**Updated** Enhanced multi-language support ensures consistent policy evaluation and clear communication across all supported languages.

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

## RAG Logic Integration

### Retrieval-Augmented Generation System
The enhanced policy API integrates advanced RAG logic to improve policy interpretation accuracy and provide context-aware responses.

### RAG Components
- **Policy Knowledge Base**: Centralized repository of policy documents, regulations, and guidelines
- **Semantic Search Engine**: Intelligent retrieval of relevant policy sections based on borrower context
- **Contextual Analysis**: Understanding of borrower-specific circumstances and their impact on policy application
- **Dynamic Policy Interpretation**: Real-time interpretation of policy rules based on current regulatory environment

### Enhanced Answer Generation
The RAG system generates more accurate and comprehensive policy answers by:
- Cross-referencing multiple policy sources
- Considering borrower-specific context
- Applying latest regulatory updates
- Providing detailed explanations with regulatory citations

### Policy Reasoning Engine
Advanced reasoning capabilities allow the system to:
- Understand complex policy interactions
- Handle edge cases and exceptions
- Provide nuanced recommendations
- Generate actionable next steps

**Updated** The RAG integration significantly improves policy interpretation accuracy and provides more comprehensive guidance to borrowers and lenders.

**Section sources**
- [loanEngine.ts](file://src/lib/loanEngine.ts)

## Compliance Scoring Algorithm

### Scoring Methodology
The compliance scoring algorithm evaluates borrower eligibility through a weighted multi-factor approach:

#### Factor Weights
- **Credit History**: 30% weight
- **Income Stability**: 25% weight  
- **Debt-to-Income Ratio**: 20% weight
- **Employment Status**: 15% weight
- **Collateral Value**: 10% weight

#### Score Calculation
```
Total Score = (Credit × 0.30) + (Income × 0.25) + (DTI × 0.20) + (Employment × 0.15) + (Collateral × 0.10)
```

#### Score Interpretation
- **90-100**: Excellent - Automatic approval
- **80-89**: Good - Standard processing
- **70-79**: Fair - Manual review required
- **Below 70**: Poor - Likely rejection

### Dynamic Weight Adjustment
The system dynamically adjusts factor weights based on:
- Market conditions
- Regulatory requirements
- Risk appetite
- Product type

### Regional Adjustments
Score calculations include regional adjustments for local economic conditions and regulatory environments.

**Section sources**
- [loanEngine.ts](file://src/lib/loanEngine.ts)

## Policy Versioning

### Version Management
The policy system maintains multiple versions to ensure backward compatibility while supporting policy updates:

#### Version Structure
- **Major Version**: Significant policy changes (breaking changes)
- **Minor Version**: New features and enhancements
- **Patch Version**: Bug fixes and minor improvements

#### Version Selection
- **Automatic**: Latest stable version by default
- **Explicit**: Specific version requested via API parameter
- **Fallback**: Graceful degradation to compatible versions

### Policy Change Management
- **Change Tracking**: All policy modifications are logged and versioned
- **Impact Analysis**: Changes are analyzed for potential impact on existing applications
- **Migration Support**: Tools and documentation for migrating between versions
- **Deprecation Policy**: Clear timelines for version sunsetting

### Audit Trail
Complete audit trail of policy evaluations including:
- Applied policy version
- Evaluation timestamp
- Decision rationale
- Compliance scores

**Section sources**
- [route.ts](file://src/app/api/policy/route.ts)

## Example Scenarios

### Scenario 1: Approved Application
**Borrower Profile**: 
- Age: 35, employed full-time
- Annual income: $75,000
- Credit score: 750
- DTI ratio: 28%

**Result**: ✅ **Approved**
- Compliance score: 92/100
- No policy violations
- Recommended loan amount: $200,000

### Scenario 2: Rejected Application  
**Borrower Profile**:
- Age: 25, self-employed
- Annual income: $45,000
- Credit score: 580
- DTI ratio: 65%

**Result**: ❌ **Rejected**
- Compliance score: 45/100
- Multiple violations detected
- Primary reasons: High DTI ratio, insufficient credit history

### Scenario 3: Pending Review
**Borrower Profile**:
- Age: 55, retired
- Annual income: $60,000 (pension)
- Credit score: 720
- DTI ratio: 45%

**Result**: ⏳ **Pending Review**
- Compliance score: 78/100
- Requires manual underwriting review
- Additional documentation needed

### Multi-Language Response Example
For Vietnamese borrowers, all policy explanations and guidance are provided in Vietnamese with culturally appropriate regulatory references.

**Section sources**
- [eligibilityRules.ts](file://src/data/eligibilityRules.ts)
- [riskRules.ts](file://src/data/riskRules.ts)

## Regulatory Framework Integration

### Global Compliance Standards
The policy system integrates with major regulatory frameworks:

#### International Standards
- **Basel III**: Banking regulations and capital requirements
- **FATF**: Anti-money laundering guidelines
- **GDPR**: Data protection and privacy requirements
- **ISO Standards**: Quality management and operational standards

#### Regional Regulations
- **US**: Dodd-Frank Act, Fair Lending Laws
- **EU**: MiFID II, PSD2, AML Directives
- **Asia-Pacific**: Local banking regulations and consumer protection laws
- **Middle East**: Sharia-compliant financing guidelines

### Real-Time Regulatory Updates
- **Automated Updates**: Policy rules updated automatically when regulations change
- **Compliance Monitoring**: Continuous monitoring of regulatory compliance
- **Alert System**: Notifications for upcoming regulatory changes
- **Audit Support**: Comprehensive audit trails for regulatory examinations

### Cross-Border Considerations
- **Currency Handling**: Multi-currency support with exchange rate considerations
- **Tax Implications**: Tax treatment varies by jurisdiction
- **Legal Requirements**: Jurisdiction-specific legal requirements
- **Cultural Adaptation**: Policy interpretation considers cultural contexts

**Section sources**
- [loanEngine.ts](file://src/lib/loanEngine.ts)
- [eligibilityRules.ts](file://src/data/eligibilityRules.ts)

---

## Implementation Notes

### Performance Considerations
- **Response Time**: Target < 2 seconds for standard policy checks
- **Scalability**: Horizontal scaling for high-volume scenarios
- **Caching**: Strategic caching of policy rules and common evaluations
- **Batch Processing**: Support for bulk policy evaluations

### Security Measures
- **Input Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: Protection against abuse and denial-of-service attacks
- **Data Encryption**: End-to-end encryption for sensitive borrower data
- **Access Control**: Role-based access control for policy management

### Monitoring and Analytics
- **Performance Metrics**: Response times, success rates, error tracking
- **Business Metrics**: Approval rates, average loan amounts, geographic distribution
- **Policy Effectiveness**: Tracking policy rule performance and effectiveness
- **User Experience**: Language preference usage and satisfaction metrics

This comprehensive Policy API documentation reflects the enhanced policy answer generation capabilities, multi-language support, and improved RAG logic integration that provide more accurate and accessible policy compliance checking for borrowers worldwide.