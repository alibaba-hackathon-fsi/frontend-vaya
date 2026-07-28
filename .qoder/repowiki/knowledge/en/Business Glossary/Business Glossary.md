---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Survival Score
- Definition：A deterministic scoring algorithm that evaluates loan applicant viability based on DTI ratios, income buffers, cash flow analysis, and risk factors. Part of the core decision engine that produces numerical scores for loan eligibility assessment.
- Aliases：survival_score、生存分数

### RAG Pipeline
- Definition：Retrieval-Augmented Generation workflow that processes natural language queries against bank policy documents through embedding, semantic search, and context-aware response generation. Handles citation tracking and policy-specific answers.
- Aliases：rag、retrieval_augmented_generation

### Advisory Workflow
- Definition：The complete AI-driven loan advisory process that flows through intent detection, missing information gathering, question engine, scenario matching, product mapping, eligibility filtering, cash flow calculation, risk evaluation, recommendation ranking, checklist generation, and lead summary creation.
- Aliases：advisory_flow、loan_advisor_workflow

### Risk Engine
- Definition：Modular risk assessment system that calculates DTI ratios, income buffer analysis, cash flow projections, risk labels, survival scores, and recommendation scores with detailed explanations for each factor.
- Aliases：risk_assessment、risk_engine

### Recommendation Engine
- Definition：Multi-bank compatible scoring system that performs scenario matching, loan product matching, priority ranking across multiple banks, and supports future expansion without architectural changes.
- Aliases：recommendation_scoring、product_matching

### Loan Profile
- Definition：Structured data object containing borrower information including income, loan amount, term, purpose, age, and other financial details used throughout the advisory workflow for calculations and eligibility checks.
- Aliases：profile、borrower_profile

### Chat Session
- Definition：In-memory state management object that tracks user conversation context, collected profile data, turn count, and session lifecycle within the chat API endpoints.
- Aliases：session、chat_state

### SSE Streaming
- Definition：Server-Sent Events implementation providing real-time bidirectional communication between frontend and backend, delivering authoritative results first followed by LLM-generated explanations in separate event streams.
- Aliases：sse、server_sent_events、streaming
