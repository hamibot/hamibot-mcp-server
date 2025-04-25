#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Define interfaces and types
interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface Device {
  id: string;
  name?: string;
  online: boolean;
  brand: string;
  model: string;
  appVersion: string;
  tags?: string[];
}

interface Script {
  id: string;
  name: string;
  version: string;
  slug: string;
  expiresAt?: string;
}

// Schema definitions
const objectIdSchema = z
  .string()
  .refine((value) => /^[0-9a-f]{24}$/.test(value), {
    message: 'Must be a 24-character hexadecimal string, example: 507f1f77bcf86cd799439011',
  });

const deviceSchema = z.object({
  id: objectIdSchema.describe('Device ID'),
  name: z.string().optional().describe('Device name'),
});

class HamibotClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.hamibot.com/v2') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDevices(): Promise<ApiResponse<Device[]>> {
    return this.request<Device[]>('/devices', { method: 'GET' });
  }

  async getScripts(): Promise<ApiResponse<Script[]>> {
    return this.request<Script[]>('/scripts', { method: 'GET' });
  }

  async runScript({ scriptId, devices, vars }: {
    scriptId: string;
    devices: { id: string }[];
    vars?: Record<string, unknown>;
  }): Promise<ApiResponse<unknown>> {
    return this.request(`/scripts/${scriptId}/run`, {
      method: 'POST',
      body: JSON.stringify({ devices, vars }),
    });
  }

  async execute({ code, devices, vars }: {
    code: string;
    devices: { id: string }[];
    vars?: Record<string, unknown>;
  }): Promise<ApiResponse<unknown>> {
    return this.request(`/scripts/execute`, {
      method: 'POST',
      body: JSON.stringify({ code, devices, vars }),
    });
  }
}

const { HAMIBOT_PERSONAL_ACCESS_TOKEN } = process.env;

if (!HAMIBOT_PERSONAL_ACCESS_TOKEN) {
  throw new Error('HAMIBOT_PERSONAL_ACCESS_TOKEN environment variable is required');
}

async function main() {
  const client = new HamibotClient(HAMIBOT_PERSONAL_ACCESS_TOKEN!);

  const server = new McpServer({
    name: 'hamibot',
    version: '1.0.0.' + Math.floor(Date.now() / 1000),
    description: 'Hamibot MCP Server',
  });

  // Tool registrations
  server.tool(
    'list-devices',
    'List all connected devices',
    {},
    async () => {
      try {
        const data = await client.getDevices();
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Failed to get device list: ${error instanceof Error ? error.message : 'Unknown error'}` }) }],
        };
      }
    }
  );

  server.tool(
    'list-scripts',
    'List all available automation scripts',
    {},
    async () => {
      try {
        const data = await client.getScripts();
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Failed to get script list: ${error instanceof Error ? error.message : 'Unknown error'}` }) }],
        };
      }
    });

  server.tool(
    'run-script',
    'Run an automation script on specified devices',
    {
      scriptId: objectIdSchema.describe('The ID of the script to run (24-character hex)'),
      devices: z.array(deviceSchema).describe('Array of target devices to run the script on. Each device requires an ID and optional name'),
      vars: z.record(z.unknown()).optional().describe('Optional variables to pass to the script. Key-value pairs that will be available in the script context'),
    },
    async ({ scriptId, devices, vars }) => {
      try {
        const data = await client.runScript({ scriptId, devices, vars });
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Failed to run script: ${error instanceof Error ? error.message : 'Unknown error'}` }) }],
        };
      }
    }
  );

  server.tool(
    'execute',
    'Execute custom JavaScript code on specified devices',
    {
      code: z.string().describe('JavaScript code to be executed on the devices. Must be valid JavaScript/Auto.js code'),
      devices: z.array(deviceSchema).describe('Array of target devices to execute the code on. Each device requires an ID and optional name'),
      vars: z.record(z.unknown()).optional().describe('Optional variables to pass to the code. Key-value pairs that will be available in the code context'),
    },
    async ({ code, devices, vars }) => {
      try {
        const data = await client.execute({ code, devices, vars });
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Failed to execute script: ${error instanceof Error ? error.message : 'Unknown error'}` }) }],
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hamibot MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
