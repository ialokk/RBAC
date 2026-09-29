import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../common/http-error';
import { authService } from './auth.service';

export const authController = {
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.requestOtp(req.body);
      res.status(202).json({ message: 'OTP sent' });
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { target, code, deviceId } = req.body;
      const result = await authService.verifyOtp({
        target,
        code,
        deviceId,
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: req.ip,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(req.body.refreshToken, req);
      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Authentication required');
      }
      await authService.logout(req.user.id, req.body.refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Authentication required');
      }
      const sessions = await authService.listSessions(req.user.id);
      res.status(200).json({ items: sessions });
    } catch (err) {
      next(err);
    }
  },

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Authentication required');
      }
      await authService.revokeSession(req.user.id, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Authentication required');
      }
      const me = await authService.getMe(req.user.id);
      res.status(200).json(me);
    } catch (err) {
      next(err);
    }
  },
};
