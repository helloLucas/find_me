import React from 'react';
import { LucasSurvivalApp } from '../../../minigames/lucas-survival/LucasSurvivalApp';
import '../../../minigames/lucas-survival/styles.css';

export const LucasSurvivalTab: React.FC = () => {
  return (
    <div className="w-full h-full bg-black">
      <LucasSurvivalApp isPractice={true} />
    </div>
  );
};
