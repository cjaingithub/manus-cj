import { OpenAI } from "openai";

/**
 * Configuration for streaming responses
 */
export interface StreamingConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk {
  type: "content" | "error" | "complete" | "metadata";
  content?: string;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    totalTokens?: number;
    completionTokens?: number;
    promptTokens?: number;
    finishReason?: string;
  };
}

/**
 * Stream handler callback type
 */
export type StreamCallback = (chunk: StreamChunk) => Promise<void>;

/**
 * Create a streaming response from Hunter Alpha
 * Yields chunks of text as they arrive from the API
 */
export async function* streamHunterAlpha(
  client: OpenAI,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  config: StreamingConfig
): AsyncGenerator<StreamChunk> {
  try {
    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2000,
      top_p: config.topP ?? 1,
      frequency_penalty: config.frequencyPenalty ?? 0,
      presence_penalty: config.presencePenalty ?? 0,
      stream: true,
    });

    let totalTokens = 0;
    let completionTokens = 0;
    let promptTokens = 0;
    let finishReason = "";

    for await (const event of stream) {
      // Handle content chunks
      if (event.choices[0]?.delta?.content) {
        yield {
          type: "content",
          content: event.choices[0].delta.content,
        };
      }

      // Handle finish reason
      if (event.choices[0]?.finish_reason) {
        finishReason = event.choices[0].finish_reason ?? "";
      }

      // Handle usage information (usually at the end)
      if (event.usage) {
        totalTokens = event.usage.total_tokens;
        completionTokens = event.usage.completion_tokens;
        promptTokens = event.usage.prompt_tokens;
      }
    }

    // Yield completion metadata
    yield {
      type: "metadata",
      metadata: {
        totalTokens,
        completionTokens,
        promptTokens,
        finishReason,
      },
    };

    // Yield completion signal
    yield {
      type: "complete",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error instanceof OpenAI.APIError ? error.code : "UNKNOWN_ERROR") ?? "UNKNOWN_ERROR";

    yield {
      type: "error",
      error: {
        code: errorCode,
        message: errorMessage,
      },
    };
  }
}

/**
 * Process streaming response with callback
 * Handles backpressure and error management
 */
export async function processStream(
  generator: AsyncGenerator<StreamChunk>,
  callback: StreamCallback,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  }
): Promise<{
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
  finishReason: string;
  error?: string;
}> {
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;
  const timeout = options?.timeout ?? 30000;

  let totalTokens = 0;
  let completionTokens = 0;
  let promptTokens = 0;
  let finishReason = "";
  let error: string | undefined;

  try {
    for await (const chunk of generator) {
      // Set timeout for callback execution
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Callback timeout")), timeout)
      );

      try {
        await Promise.race([callback(chunk), timeoutPromise]);

        // Update metadata from chunks
        if (chunk.type === "metadata" && chunk.metadata) {
          totalTokens = chunk.metadata.totalTokens ?? totalTokens;
          completionTokens = chunk.metadata.completionTokens ?? completionTokens;
          promptTokens = chunk.metadata.promptTokens ?? promptTokens;
          finishReason = chunk.metadata.finishReason ?? finishReason;
        }

        // Handle errors
        if (chunk.type === "error" && chunk.error) {
          error = `${chunk.error.code}: ${chunk.error.message}`;
          break;
        }
      } catch (callbackError) {
        const callbackErrorMessage =
          callbackError instanceof Error ? callbackError.message : String(callbackError);
        console.error("[Streaming] Callback error:", callbackErrorMessage);
        throw callbackError;
      }
    }
  } catch (streamError) {
    const streamErrorMessage = streamError instanceof Error ? streamError.message : String(streamError);
    error = `Stream processing failed: ${streamErrorMessage}`;
  }

  return {
    totalTokens,
    completionTokens,
    promptTokens,
    finishReason,
    error,
  };
}

/**
 * Collect all chunks into a single string
 * Useful for non-streaming consumption
 */
export async function collectStreamChunks(
  generator: AsyncGenerator<StreamChunk>
): Promise<{
  content: string;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
  finishReason: string;
}> {
  let content = "";
  let totalTokens = 0;
  let completionTokens = 0;
  let promptTokens = 0;
  let finishReason = "";

  for await (const chunk of generator) {
    if (chunk.type === "content" && chunk.content) {
      content += chunk.content;
    } else if (chunk.type === "metadata" && chunk.metadata) {
      totalTokens = chunk.metadata.totalTokens ?? totalTokens;
      completionTokens = chunk.metadata.completionTokens ?? completionTokens;
      promptTokens = chunk.metadata.promptTokens ?? promptTokens;
      finishReason = chunk.metadata.finishReason ?? finishReason;
    }
  }

  return {
    content,
    totalTokens,
    completionTokens,
    promptTokens,
    finishReason,
  };
}
