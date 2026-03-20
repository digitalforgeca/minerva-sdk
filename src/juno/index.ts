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
    this.baseUrl = options.baseUrl ?? 'https://zkesg.com/api';
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
    const response = await fetch(`${this.baseUrl}/juno/design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Juno API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.circuit as Circuit;
  }

  /**
   * Modify an existing circuit based on natural language instructions.
   *
   * @param circuit - The existing circuit to modify
   * @param instruction - What to change
   * @returns A modified MinervaFormat Circuit
   */
  async modify(circuit: Circuit, instruction: string): Promise<Circuit> {
    const response = await fetch(`${this.baseUrl}/juno/modify`, {
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
    return data.circuit as Circuit;
  }
}
