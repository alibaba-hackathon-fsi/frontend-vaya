---
kind: external_dependency
name: OpenAI SDK for Chinese Model Integration
slug: openai-sdk
category: external_dependency
category_hints:
    - sdk_real_api
scope:
    - '**'
---

Used as the OpenAI-compatible client library to integrate with Chinese LLM providers (Qwen via DashScope and DeepSeek). The SDK provides a unified interface for both model providers through the LLM provider abstraction layer, enabling seamless switching between Qwen and DeepSeek models via environment configuration.