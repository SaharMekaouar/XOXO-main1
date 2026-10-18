import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';

export interface MeetingGuestPayload {
  scope: 'meeting-guest';
  meetingId: string;
  participantId: string;
}

@Injectable()
export class MeetingGuestGuard implements CanActivate {
  private readonly secret = process.env.JWT_GUEST_SECRET || 'change_me_guest_secret';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing invite token');
    }

    try {
      const payload = verify(token, this.secret) as MeetingGuestPayload;
      if (payload.scope !== 'meeting-guest') {
        throw new UnauthorizedException('Invalid token scope');
      }
      request['guest'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired invite link');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}