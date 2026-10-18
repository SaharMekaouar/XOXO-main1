import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface SpeakRequest {
  meetingId: string;
  speakerId: string;
  speakerName: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/meeting' })
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  // Un seul locuteur actif par réunion à la fois : meetingId -> qui parle actuellement.
  // En mémoire uniquement (suffisant tant qu'un seul processus backend tourne).
  private activeSpeakers = new Map<string, { speakerId: string; speakerName: string }>();

  handleConnection(client: Socket): void {
    const meetingId = client.handshake.query.meetingId as string;
    if (meetingId) {
      client.join(meetingId);
      client.data.meetingId = meetingId;
    }
  }

  handleDisconnect(client: Socket): void {
    // Si la personne qui tenait la parole se déconnecte brutalement
    // (onglet fermé, coupure réseau), on libère automatiquement le verrou
    // pour ne jamais bloquer durablement toute la réunion.
    const meetingId = client.data.meetingId;
    const speakerId = client.data.speakerId;
    if (meetingId && speakerId) {
      const current = this.activeSpeakers.get(meetingId);
      if (current?.speakerId === speakerId) {
        this.activeSpeakers.delete(meetingId);
        this.server.to(meetingId).emit('speaker-unlocked');
      }
    }
  }

  @SubscribeMessage('request-speak')
  handleRequestSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SpeakRequest,
  ): { granted: boolean; speakerName?: string } {
    const current = this.activeSpeakers.get(payload.meetingId);
    if (current && current.speakerId !== payload.speakerId) {
      return { granted: false, speakerName: current.speakerName };
    }
    this.activeSpeakers.set(payload.meetingId, {
      speakerId: payload.speakerId,
      speakerName: payload.speakerName,
    });
    client.data.speakerId = payload.speakerId;
    this.server.to(payload.meetingId).emit('speaker-locked', {
      speakerId: payload.speakerId,
      speakerName: payload.speakerName,
    });
    return { granted: true };
  }

  @SubscribeMessage('release-speak')
  handleReleaseSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string; speakerId: string },
  ): void {
    const current = this.activeSpeakers.get(payload.meetingId);
    if (current?.speakerId === payload.speakerId) {
      this.activeSpeakers.delete(payload.meetingId);
      client.data.speakerId = undefined;
      this.server.to(payload.meetingId).emit('speaker-unlocked');
    }
  }

  broadcastTurn(meetingId: string, turn: unknown): void {
    this.server.to(meetingId).emit('new-turn', turn);
  }

  broadcastParticipants(meetingId: string, participants: unknown): void {
    this.server.to(meetingId).emit('participants-updated', participants);
  }
}