import React from 'react';
import agentHeroPng from '../../assets/agent_network_hero.png';

export const AgentNetworkHero: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden flex justify-center items-center select-none bg-[#f4f8fc]">
      <video
        src="/whatsapp_hero_video.mp4"
        autoPlay
        loop
        muted
        playsInline
        poster={agentHeroPng}
        className="max-w-[85%] max-h-[85%] rounded-2xl object-contain block shadow-lg"
      />
    </div>
  );
};

export default AgentNetworkHero;


