import React, { useEffect } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';

function App() {
  useEffect(() => {
    const game = new Phaser.Game(gameConfig);

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-yellow-500 mb-4">The Legend of Kokopelli</h1>
      <div id="game-container" className="rounded-lg overflow-hidden shadow-2xl"></div>
      <div className="mt-4 text-gray-300 text-center">
        <p className="mb-2">Controls:</p>
        <p>Arrow keys to move and jump</p>
        <p>Spacebar to play the flute (enhances jump power)</p>
        <p className="mt-2">Collect all fruits to advance to the next level!</p>
      </div>
    </div>
  );
}

export default App;