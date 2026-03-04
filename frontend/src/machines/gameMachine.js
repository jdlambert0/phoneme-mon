/**
 * Phoneme-Mon Game State Machine (XState v5)
 * States: INIT_BOOT → DIEGETIC_INSTALL → CALIBRATION → BATTLE_LOOP → RESULT_DISPLAY → END_GAME
 */
import { createMachine, assign } from 'xstate';
import { resolveRPS, assignPlayerTitle, getDominantPhoneme, detectGlassDagger, averageMFCC } from '../utils/dspMath';
import { getEnemyMove, computeDifficulty } from './enemyAI';

export const INITIAL_CONTEXT = {
  oraclePersonality: 'mentor',
  oracleGender: 'female',
  gameMode: 'solo',

  // Calibration
  calibrationStep: 0, // 0–2 = P1 phonemes, 3–5 = P2 phonemes (passplay)
  calibrationSamples: { p1: { burst: [], flow: [], tone: [] }, p2: { burst: [], flow: [], tone: [] } },

  // Players
  players: [], // [{ name, title, calibration: { burst, flow, tone } }]

  // Battle state
  playerHealth: [10, 10],
  round: 0,
  maxRounds: 10,
  pendingMoves: [null, null],
  articulationScores: [0, 0],
  glassDaggerActive: [false, false],
  playerHistory: [], // for Markov enemy AI
  difficulty: 0.3,
  currentTurn: 0,

  // Result
  roundWinner: null,
  winner: null,
  finalScore: [0, 0],
};

const CALIBRATION_KEYS = ['burst', 'flow', 'tone'];

function getCalibrationLabel(step, gameMode) {
  const phoneme = CALIBRATION_KEYS[step % 3];
  const player = (step < 3 || gameMode === 'solo') ? 1 : 2;
  return { phoneme, player };
}

export const gameMachine = createMachine({
  id: 'phonemon',
  initial: 'INIT_BOOT',
  context: INITIAL_CONTEXT,

  states: {
    INIT_BOOT: {
      on: {
        TOUCH: { target: 'DIEGETIC_INSTALL' },
      },
    },

    DIEGETIC_INSTALL: {
      on: {
        SET_ORACLE: {
          target: 'CALIBRATION',
          actions: assign({
            oraclePersonality: ({ event }) => event.personality,
            oracleGender: ({ event }) => event.gender,
            gameMode: ({ event }) => event.gameMode || 'solo',
            calibrationStep: () => 0,
            calibrationSamples: () => ({ p1: { burst: [], flow: [], tone: [] }, p2: { burst: [], flow: [], tone: [] } }),
            players: () => [],
          }),
        },
      },
    },

    CALIBRATION: {
      on: {
        ADD_CALIBRATION_SAMPLE: {
          actions: assign(({ context, event }) => {
            const step = context.calibrationStep;
            const phoneme = CALIBRATION_KEYS[step % 3];
            const playerKey = step < 3 ? 'p1' : 'p2';
            const updated = {
              ...context.calibrationSamples,
              [playerKey]: {
                ...context.calibrationSamples[playerKey],
                [phoneme]: [...(context.calibrationSamples[playerKey][phoneme] || []), event.mfcc],
              },
            };
            return { calibrationSamples: updated };
          }),
        },

        NEXT_CALIBRATION_PHASE: [
          // P1 still has phases left
          {
            guard: ({ context }) => context.calibrationStep < 2,
            actions: assign({ calibrationStep: ({ context }) => context.calibrationStep + 1 }),
          },
          // Solo mode: P1 done, start battle
          {
            guard: ({ context }) => context.calibrationStep === 2 && context.gameMode === 'solo',
            target: 'BATTLE_LOOP',
            actions: assign(({ context }) => {
              const cs = context.calibrationSamples.p1;
              const calibration = {
                burst: averageMFCC(cs.burst),
                flow: averageMFCC(cs.flow),
                tone: averageMFCC(cs.tone),
              };
              const dominant = getDominantPhoneme({ burst: cs.burst, flow: cs.flow, tone: cs.tone });
              const title = assignPlayerTitle(dominant);
              return {
                players: [{ name: 'Player', title, calibration }],
                calibrationStep: 3,
                playerHealth: [10, 10],
                round: 0,
                finalScore: [0, 0],
                playerHistory: [],
                pendingMoves: [null, null],
              };
            }),
          },
          // PassPlay: P1 done, move to P2
          {
            guard: ({ context }) => context.calibrationStep === 2 && context.gameMode === 'passplay',
            actions: assign({ calibrationStep: () => 3 }),
          },
          // PassPlay P2 still has phases
          {
            guard: ({ context }) => context.calibrationStep >= 3 && context.calibrationStep < 5,
            actions: assign({ calibrationStep: ({ context }) => context.calibrationStep + 1 }),
          },
          // PassPlay P2 done → start battle
          {
            guard: ({ context }) => context.calibrationStep === 5 && context.gameMode === 'passplay',
            target: 'BATTLE_LOOP',
            actions: assign(({ context }) => {
              const cs1 = context.calibrationSamples.p1;
              const cs2 = context.calibrationSamples.p2;
              const buildCalib = (cs) => ({
                burst: averageMFCC(cs.burst),
                flow: averageMFCC(cs.flow),
                tone: averageMFCC(cs.tone),
              });
              const dominant1 = getDominantPhoneme({ burst: cs1.burst, flow: cs1.flow, tone: cs1.tone });
              const dominant2 = getDominantPhoneme({ burst: cs2.burst, flow: cs2.flow, tone: cs2.tone });
              return {
                players: [
                  { name: 'Player 1', title: assignPlayerTitle(dominant1), calibration: buildCalib(cs1) },
                  { name: 'Player 2', title: assignPlayerTitle(dominant2), calibration: buildCalib(cs2) },
                ],
                calibrationStep: 6,
                playerHealth: [10, 10],
                round: 0,
                finalScore: [0, 0],
                playerHistory: [],
                pendingMoves: [null, null],
                currentTurn: 0,
              };
            }),
          },
        ],
      },
    },

    BATTLE_LOOP: {
      on: {
        COMMIT_MOVE: [
          // Solo: compute enemy & resolve
          {
            guard: ({ context }) => context.gameMode === 'solo',
            target: 'RESULT_DISPLAY',
            actions: assign(({ context, event }) => {
              const playerMove = event.move;
              const artScore = event.articulationScore ?? 0;
              const glassActive = detectGlassDagger(artScore);
              const difficulty = computeDifficulty(context.round, artScore);
              const enemyMove = getEnemyMove([...context.playerHistory, playerMove], difficulty);
              const rpsResult = resolveRPS(playerMove, enemyMove);

              let health = [...context.playerHealth];
              let score = [...context.finalScore];
              if (rpsResult === 'p1') { health[1] = Math.max(0, health[1] - 1); score[0]++; }
              else if (rpsResult === 'p2') { health[0] = Math.max(0, health[0] - 1); score[1]++; }

              return {
                pendingMoves: [playerMove, enemyMove],
                articulationScores: [artScore, 0],
                glassDaggerActive: [glassActive, false],
                playerHistory: [...context.playerHistory, playerMove].slice(-20),
                playerHealth: health,
                finalScore: score,
                roundWinner: rpsResult,
                round: context.round + 1,
                difficulty,
              };
            }),
          },
          // PassPlay P1 moves → wait for P2
          {
            guard: ({ context }) => context.gameMode === 'passplay' && context.currentTurn === 0,
            actions: assign(({ context, event }) => ({
              pendingMoves: [event.move, context.pendingMoves[1]],
              articulationScores: [event.articulationScore ?? 0, context.articulationScores[1]],
              currentTurn: 1,
            })),
          },
          // PassPlay P2 moves → resolve
          {
            guard: ({ context }) => context.gameMode === 'passplay' && context.currentTurn === 1,
            target: 'RESULT_DISPLAY',
            actions: assign(({ context, event }) => {
              const move1 = context.pendingMoves[0];
              const move2 = event.move;
              const rpsResult = resolveRPS(move1, move2);
              let health = [...context.playerHealth];
              let score = [...context.finalScore];
              if (rpsResult === 'p1') { health[1] = Math.max(0, health[1] - 1); score[0]++; }
              else if (rpsResult === 'p2') { health[0] = Math.max(0, health[0] - 1); score[1]++; }
              return {
                pendingMoves: [move1, move2],
                articulationScores: [context.articulationScores[0], event.articulationScore ?? 0],
                playerHealth: health,
                finalScore: score,
                roundWinner: rpsResult,
                round: context.round + 1,
                currentTurn: 0,
              };
            }),
          },
        ],

        TIMEOUT_MOVE: {
          target: 'RESULT_DISPLAY',
          actions: assign(({ context }) => {
            const playerMove = context.pendingMoves[0] || 'burst';
            const enemyMove = getEnemyMove(context.playerHistory, 0.9);
            const rpsResult = resolveRPS(playerMove, enemyMove);
            let health = [...context.playerHealth];
            let score = [...context.finalScore];
            if (rpsResult === 'p1') { health[1] = Math.max(0, health[1] - 1); score[0]++; }
            else if (rpsResult === 'p2') { health[0] = Math.max(0, health[0] - 1); score[1]++; }
            return {
              pendingMoves: [playerMove, enemyMove],
              playerHealth: health,
              finalScore: score,
              roundWinner: rpsResult,
              round: context.round + 1,
              currentTurn: 0,
            };
          }),
        },
      },
    },

    RESULT_DISPLAY: {
      after: {
        3500: [
          {
            guard: ({ context }) =>
              context.playerHealth[0] <= 0 ||
              context.playerHealth[1] <= 0 ||
              context.round >= context.maxRounds,
            target: 'END_GAME',
            actions: assign(({ context }) => {
              let winner = 'tie';
              if (context.playerHealth[0] <= 0) winner = 'p2';
              else if (context.playerHealth[1] <= 0) winner = 'p1';
              else winner = context.finalScore[0] > context.finalScore[1] ? 'p1' : context.finalScore[1] > context.finalScore[0] ? 'p2' : 'tie';
              return { winner };
            }),
          },
          {
            target: 'BATTLE_LOOP',
            actions: assign({ pendingMoves: () => [null, null] }),
          },
        ],
      },
    },

    END_GAME: {
      on: {
        REPLAY: {
          target: 'INIT_BOOT',
          actions: assign(INITIAL_CONTEXT),
        },
      },
    },
  },
});
