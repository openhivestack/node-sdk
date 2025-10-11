import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Agent } from '../agent.js';
import { IAgentMessage } from '../types';

export class AgentServer {
  private app: Express;

  constructor(private agent: Agent) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/status', (req: Request, res: Response) => {
      const identity = this.agent.identity();
      res.status(200).json({
        agentId: identity.id(),
        status: 'ok',
        version: identity.version(),
      });
    });

    this.app.get('/capabilities', (req: Request, res: Response) => {
      const identity = this.agent.identity();
      res.status(200).json({
        agentId: identity.id(),
        capabilities: identity.capabilities(),
      });
    });

    this.app.post('/registry/add', async (req: Request, res: Response) => {
      try {
        const agentInfo = req.body;
        const result = await this.agent.registry.add(agentInfo);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/registry/list', async (req: Request, res: Response) => {
      try {
        const agents = await this.agent.registry.list();
        res.status(200).json(agents);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/registry/search', async (req: Request, res: Response) => {
      try {
        const query = req.query.q as string;
        const results = await this.agent.registry.search(query);
        res.status(200).json(results);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.get('/registry/:agentId', async (req: Request, res: Response) => {
      try {
        const agent = await this.agent.registry.get(req.params.agentId);
        if (agent) {
          res.status(200).json(agent);
        } else {
          res.status(404).json({ error: 'Agent not found' });
        }
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.app.delete(
      '/registry/:agentId',
      async (req: Request, res: Response) => {
        try {
          await this.agent.registry.remove(req.params.agentId);
          res.status(204).send();
        } catch (error) {
          res.status(500).json({ error: (error as Error).message });
        }
      }
    );

    this.app.post('/tasks', async (req: Request, res: Response) => {
      const message: IAgentMessage = req.body;

      try {
        const senderPublicKey = await this.agent.publicKey(message.from);
        if (!senderPublicKey) {
          return res.status(401).json({
            error: 'Sender public key not found. Peer not configured.',
          });
        }

        const responseData = await this.agent.process(message, senderPublicKey);

        let responseMessage: IAgentMessage;
        const identity = this.agent.identity();

        if ('error' in responseData) {
          responseMessage = identity.createTaskError(
            message.from,
            responseData.task_id,
            responseData.error,
            responseData.message,
            responseData.retry
          );
          return res.status(500).json(responseMessage);
        } else {
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
        return res.status(500).json({ error: errorMessage });
      }
    });
  }

  public start(port?: number): Promise<void> {
    const listenPort = port || new URL(this.agent.endpoint()).port;
    return new Promise((resolve) => {
      this.app.listen(listenPort, () => {
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
