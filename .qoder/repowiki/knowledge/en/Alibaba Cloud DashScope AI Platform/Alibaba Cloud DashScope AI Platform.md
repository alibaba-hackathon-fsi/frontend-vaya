---
kind: external_dependency
name: Alibaba Cloud DashScope AI Platform
slug: dashscope
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

Primary LLM provider platform for hosting Qwen models. Integrated via OpenAI-compatible API endpoint using DASHSCOPE_API_KEY environment variable. Serves as the default LLM provider in the multi-provider architecture, handling intent classification, policy queries, and explanation generation through the standardized LLM provider interface.