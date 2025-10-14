import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Agent } from '../agent.js';
import { IAgentMessage } from '../types';
import debug from 'debug';

const log = debug('openhive:agent-server');

export class AgentServer {
  private app: Express;

  constructor(private agent: Agent) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.setupRoutes();
    log('AgentServer initialized');
  }

  private setupRoutes() {
    log('Setting up routes');
    this.app.get('/status', (req: Request, res: Response) => {
      log('Received request for /status');
      const identity = this.agent.identity();
      res.status(200).json({
        agentId: identity.id(),
        status: 'ok',
        version: identity.version(),
      });
    });

    this.app.get('/capabilities', (req: Request, res: Response) => {
      log('Received request for /capabilities');
      const identity = this.agent.identity();
      res.status(200).json({
        agentId: identity.id(),
        capabilities: identity.capabilities(),
      });
    });

    this.app.post('/registry/add', async (req: Request, res: Response) => {
      log('Received request for /registry/add');
      try {
        const agentInfo = req.body;
        const result = await this.agent.registry.add(agentInfo);
        log(`Agent ${agentInfo.id} added to registry`);
        res.status(201).json(result);
      } catch (error) {
        const errorMessage = (error as Error).message;
        log(`Error adding agent to registry: ${errorMessage}`, error);
        res.status(500).json({ error: errorMessage });
      }
    });

    this.app.get('/registry/list', async (req: Request, res: Response) => {
      log('Received request for /registry/list');
      try {
        const agents = await this.agent.registry.list();
        log(`Returning ${agents.length} agents from registry`);
        res.status(200).json(agents);
      } catch (error) {
        const errorMessage = (error as Error).message;
        log(`Error listing agents from registry: ${errorMessage}`, error);
        res.status(500).json({ error: errorMessage });
      }
    });

    this.app.get('/registry/search', async (req: Request, res: Response) => {
      const query = req.query.q as string;
      log(`Received request for /registry/search with query: ${query}`);
      try {
        const results = await this.agent.registry.search(query);
        log(`Found ${results.length} agents for query: ${query}`);
        res.status(200).json(results);
      } catch (error) {
        const errorMessage = (error as Error).message;
        log(`Error searching agents in registry: ${errorMessage}`, error);
        res.status(500).json({ error: errorMessage });
      }
    });

    this.app.get('/registry/:agentId', async (req: Request, res: Response) => {
      const agentId = req.params.agentId;
      log(`Received request for /registry/${agentId}`);
      try {
        const agent = await this.agent.registry.get(agentId);
        if (agent) {
          log(`Agent ${agentId} found in registry`);
          res.status(200).json(agent);
        } else {
          log(`Agent ${agentId} not found in registry`);
          res.status(404).json({ error: 'Agent not found' });
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        log(
          `Error getting agent ${agentId} from registry: ${errorMessage}`,
          error
        );
        res.status(500).json({ error: errorMessage });
      }
    });

    this.app.delete(
      '/registry/:agentId',
      async (req: Request, res: Response) => {
        const agentId = req.params.agentId;
        log(`Received request to delete /registry/${agentId}`);
        try {
          await this.agent.registry.remove(agentId);
          log(`Agent ${agentId} removed from registry`);
          res.status(204).send();
        } catch (error) {
          const errorMessage = (error as Error).message;
          log(
            `Error removing agent ${agentId} from registry: ${errorMessage}`,
            error
          );
          res.status(500).json({ error: errorMessage });
        }
      }
    );

    this.app.put('/registry/:agentId', async (req: Request, res: Response) => {
      const agentId = req.params.agentId;
      log(`Received request to update /registry/${agentId}`);
      try {
        const agentInfo = req.body;
        await this.agent.registry.update(agentInfo);
        log(`Agent ${agentId} updated in registry`);
        res.status(200).json(agentInfo);
      } catch (error) {
        const errorMessage = (error as Error).message;
        log(
          `Error updating agent ${agentId} in registry: ${errorMessage}`,
          error
        );
        res.status(500).json({ error: errorMessage });
      }
    });

    this.app.post('/tasks', async (req: Request, res: Response) => {
      const message: IAgentMessage = req.body;
      log(`Received task request from ${message.from}`);
      try {
        const senderPublicKey = await this.agent.publicKey(message.from);
        if (!senderPublicKey) {
          log(`Sender public key not found for agent: ${message.from}`);
          return res.status(401).json({
            error: 'Sender public key not found. Peer not configured.',
          });
        }

        const responseData = await this.agent.process(message, senderPublicKey);

        let responseMessage: IAgentMessage;
        const identity = this.agent.identity();

        if ('error' in responseData) {
          log(
            `Task processing failed with error: ${responseData.error}. Sending error response.`
          );
          responseMessage = identity.createTaskError(
            message.from,
            responseData.task_id,
            responseData.error,
            responseData.message,
            responseData.retry
          );
          return res.status(500).json(responseMessage);
        } else {
          log(`Task processed successfully. Sending result.`);
          responseMessage = identity.createTaskResult(
            message.from,
            responseData.task_id,
            responseData.result
          );
          return res.status(200).json(responseMessage);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'A critical server error occurred';
        log(`Critical error in /tasks endpoint: ${errorMessage}`, error);
        return res.status(500).json({ error: errorMessage });
      }
    });
  }

  public start(port?: number): Promise<void> {
    const listenPort = port || new URL(this.agent.endpoint()).port;
    log(`Starting agent server on port: ${listenPort}`);
    return new Promise((resolve) => {
      this.app.listen(listenPort, () => {
        log(
          `Agent ${this.agent
            .identity()
            .id()} HTTP server listening on port ${listenPort}`
        );
        console.log(
          `Agent ${this.agent
            .identity()
            .id()} HTTP server listening on port ${listenPort}`
        );
        resolve();
      });
    });
  }
}
