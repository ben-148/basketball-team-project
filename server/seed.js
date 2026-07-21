import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';
import Game from './models/Game.js';
import PlayerGameStats from './models/PlayerGameStats.js';
import Video from './models/Video.js';

const RASKO = 'Rasko Team';
const SHOSHANAT = 'Shoshanat HaAmakin Team';

async function seed() {
  await connectDB();

  await Promise.all([
    Player.deleteMany({}),
    Game.deleteMany({}),
    PlayerGameStats.deleteMany({}),
    Video.deleteMany({}),
  ]);

  const players = await Player.insertMany([
    {
      name: 'Asaf Pines',
      age: 38,
      dateOfBirth: new Date('1988-02-12'),
      photo: 'https://lh3.googleusercontent.com/d/1MxrbB1J_RnX977wh4EONf1o7kpsLm1-X',
      bio: 'אבא לשניים, כלבויניק',
    },
    {
      name: 'Avi Atlan',
      age: 37,
      dateOfBirth: new Date('1989-10-02'),
      photo: 'https://lh3.googleusercontent.com/d/1IdLg4CN9JVKoSaajrrDsJjwxzrmlKkP2',
      bio: 'Team captain and floor general, leads the offense with sharp court vision.',
    },
    {
      name: 'Ben Oved',
      age: 37,
      dateOfBirth: new Date('1989-04-03'),
      photo: 'https://lh3.googleusercontent.com/d/15dW9s5YnIGyfMHNF2z78ty0DHA9DWHLy',
      bio: 'Sharpshooting guard known for clutch three-pointers and relentless on-ball defense.',
    },
    { name: 'מיקי', age: null, dateOfBirth: null, photo: '', bio: '' },
    { name: 'גילי', age: null, dateOfBirth: null, photo: '', bio: '' },
    { name: 'איזי', age: null, dateOfBirth: null, photo: '', bio: '' },
    { name: 'דור', age: null, dateOfBirth: null, photo: '', bio: '' },
    { name: 'יוסי', age: null, dateOfBirth: null, photo: '', bio: '' },
    { name: 'אדיר', age: null, dateOfBirth: null, photo: '', bio: '' },
  ]);

  const byName = Object.fromEntries(players.map((p) => [p.name, p]));

  const game = await Game.create({
    date: new Date('2026-05-18'),
    location: '',
    notes: '',
  });

  await PlayerGameStats.insertMany([
    { player: byName['Asaf Pines']._id, game: game._id, team: RASKO, points: 26, rebounds: 7 },
    { player: byName['Ben Oved']._id, game: game._id, team: SHOSHANAT, points: 18, rebounds: 4, assists: 3, steals: 3, turnovers: 4 },
    { player: byName['מיקי']._id, game: game._id, team: RASKO, points: 20, rebounds: 21, assists: 4, steals: 1, turnovers: 2, wins: 4 },
    { player: byName['גילי']._id, game: game._id, team: SHOSHANAT, points: 6, rebounds: 8, assists: 2, steals: 2, turnovers: 5, wins: 3 },
    { player: byName['איזי']._id, game: game._id, team: RASKO, points: 7, rebounds: 16, assists: 3, steals: 1, turnovers: 3, wins: 2 },
    { player: byName['דור']._id, game: game._id, team: SHOSHANAT, points: 8, rebounds: 10, assists: 1, turnovers: 3, wins: 2 },
    { player: byName['יוסי']._id, game: game._id, team: RASKO, points: 10, rebounds: 9, steals: 1, turnovers: 2, wins: 3 },
    { player: byName['אדיר']._id, game: game._id, team: SHOSHANAT, points: 11, rebounds: 7, turnovers: 2, wins: 4 },
  ]);

  console.log(`Seed complete: ${players.length} players, 1 game (18.05.26), 8 stat lines.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
