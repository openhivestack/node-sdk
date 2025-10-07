import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Agent } from './agent.js';
import { IHiveMessage } from './types/index.js';

export class AgentHttpServer {
  private app: Express;

  constructor(private agent: Agent) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/status', (req: Request, res: Response) => {
      const identity = this.agent.getIdentity();
      res.status(200).json({
        agentId: identity.id(),
        status: 'ok',
        version: identity.version(),
      });
    });

    this.app.get('/capabilities', (req: Request, res: Response) => {
      const identity = this.agent.getIdentity();
      res.status(200).json({
        agentId: identity.id(),
        capabilities: identity.capabilities(),
      });
    });

    this.app.post('/tasks', async (req: Request, res: Response) => {
      const message: IHiveMessage = req.body;

      try {
        const senderPublicKey = this.agent.getPeerPublicKey(message.from);
        if (!senderPublicKey) {
          return res.status(401).json({
            error: 'Sender public key not found. Peer not configured.',
          });
        }

        const responseData = await this.agent.handleTaskRequest(
          message,
          senderPublicKey
        );

        let responseMessage: IHiveMessage;
        const identity = this.agent.getIdentity();

        if ('error' in responseData) {
          responseMessage = identity.createTaskError(
            message.from,
            responseData.task_id,
            responseData.error,
            responseData.message,
            responseData.retry
          );
          res.status(500).json(responseMessage);
        } else {
          responseMessage = identity.createTaskResult(
            message.from,
            responseData.task_id,
            responseData.result
          );
          res.status(200).json(responseMessage);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'A critical server error occurred';
        res.status(500).json({ error: errorMessage });
      }
    });
  }

  public start(port?: number): Promise<void> {
    const listenPort = port || this.agent.getPort();
    return new Promise((resolve) => {
      this.app.listen(listenPort, () => {
        console.log(
          `Agent ${this.agent
            .getIdentity()
            .id()} HTTP server listening on port ${listenPort}`
        );
        resolve();
      });
    });
  }
}
