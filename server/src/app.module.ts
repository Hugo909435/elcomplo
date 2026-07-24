import { Controller, Get, Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { RoomManager } from './game/room.manager';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}

@Module({
  controllers: [HealthController],
  providers: [RoomManager, GameGateway],
})
export class AppModule {}
