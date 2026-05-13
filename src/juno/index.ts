import type { Circuit, JunoOptions } from '../types';

/**
 * Juno — AI circuit design oracle client
 *
 * Connects to the Juno API to generate MinervaFormat circuits
 * from natural language descriptions.
 *
 * @example
 * ```typescript
 * const juno = new Juno({ apiKey: 'mk_...' });
 * const circuit = await juno.design('Prove my salary is above 50k');
 * ```
 */
export class Juno {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: JunoOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://zkesg.com/api/v1';
  }

  /**
   * Generate a circuit from a natural language description.
   *
   * @param prompt - Plain English description of what to prove
   * @returns A MinervaFormat Circuit definition
   *
   * @example
   * ```typescript
   * const circuit = await juno.design(
   *   'Prove my company has fewer than 500 employees without revealing the count'
   * );
   * ```
   */
  async design(prompt: string): Promise<Circuit> {
    const response = await fetch(`${this.baseUrl}/juno/generate-circuit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ description: prompt }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Juno API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.data?.circuit ?? data.circuit as Circuit;
  }

  /**
   * Chat with Juno for interactive circuit design.
   *
   * @param message - Your message to Juno
   * @param history - Previous messages in the conversation
   * @returns Juno's response (may include a circuit)
   */
  async chat(message: string, history?: { role: string; content: string }[]): Promise<{
    message: string;
    circuit?: Circuit;
  }> {
    const response = await fetch(`${this.baseUrl}/juno/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ message, history: history ?? [] }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Juno API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return {
      message: data.data?.message ?? data.message,
      circuit: data.data?.circuit ?? data.circuit,
    };
  }

  /**
   * Review and improve an existing circuit.
   *
   * @param circuit - The existing circuit to review
   * @param instruction - What to change or improve
   * @returns Juno's review with an improved circuit
   */
  async review(circuit: Circuit, instruction?: string): Promise<{
    feedback: string;
    circuit: Circuit;
  }> {
    const response = await fetch(`${this.baseUrl}/juno/review-circuit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ circuit, instruction }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Juno API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return {
      feedback: data.data?.feedback ?? data.feedback ?? '',
      circuit: data.data?.circuit ?? data.circuit,
    };
  }
}
