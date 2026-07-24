"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_EVENTS = exports.CLIENT_EVENTS = void 0;
exports.CLIENT_EVENTS = {
    roomCreate: 'room:create',
    roomJoin: 'room:join',
    roomLeave: 'room:leave',
    sessionResume: 'session:resume',
    gameStart: 'game:start',
    gameVote: 'game:vote',
    gamePower: 'game:power',
    gamePassPowers: 'game:passPowers',
    gameAccuse: 'game:accuse',
    gameContinue: 'game:continue',
    chatSend: 'chat:send',
};
exports.SERVER_EVENTS = {
    roomUpdate: 'room:update',
    gamePublic: 'game:public',
    gamePrivate: 'game:private',
    gamePhase: 'game:phase',
    gameVoteProgress: 'game:voteProgress',
    gamePowersProgress: 'game:powersProgress',
    gamePowers: 'game:powers',
    gamePowerResult: 'game:powerResult',
    gameAccused: 'game:accused',
    gameRevote: 'game:revote',
    gameRound: 'game:round',
    gameEnd: 'game:end',
    chatMessage: 'chat:message',
    errorEvent: 'game:error',
};
//# sourceMappingURL=protocol.js.map