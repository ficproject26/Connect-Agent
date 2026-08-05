import React from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { 
  Sparkles, ShieldAlert, Cpu, Route, Wallet, 
  Map, Award, Moon, Globe, VolumeX
} from 'lucide-react';

interface FutureFeature {
  title: string;
  icon: React.ReactNode;
  status: 'planning' | 'scaffolded' | 'ready_for_api';
  description: string;
  specs: string[];
}

const futureSpecs: FutureFeature[] = [
  {
    title: 'SOS Telemetry Dispatch',
    icon: <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />,
    status: 'scaffolded',
    description: 'Instant panic triggers for field workforce sending real-time coordinates location, emergency details to executives.',
    specs: ['VoIP dispatch connection', 'Automatic SMS warnings fallback', 'Silent audio microphone capturing'],
  },
  {
    title: 'AI Dispatch & Route Optimizer',
    icon: <Cpu className="w-6 h-6 text-indigo-500" />,
    status: 'planning',
    description: 'Predictive order matching queues and intelligent traffic-aware directions overlays mapping out path efficiency.',
    specs: ['Batch clustering algorithms', 'Historical delivery time curves modeling', 'Dynamic milestone alerts'],
  },
  {
    title: 'Digital Wallet Bank withdrawals',
    icon: <Wallet className="w-6 h-6 text-emerald-500" />,
    status: 'ready_for_api',
    description: 'Enable instant direct-deposits payouts via linked accounts linking Stripe, Razorpay or local UPI gateways.',
    specs: ['UPI payments channels', 'Weekly automated ledger balancing', 'Direct payout invoice receipt PDFs'],
  },
  {
    title: 'Leaderboards & Gamification',
    icon: <Award className="w-6 h-6 text-amber-550" />,
    status: 'scaffolded',
    description: 'Boost workforce engagement with milestone badges, weekly top performer charts and cash bonuses.',
    specs: ['Fulfillment streaks tracking', 'Zone based performance ratings', 'Partner badges unlocks catalog'],
  },
];

export const FutureFeaturesView: React.FC = () => {
  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center bg-white p-6 rounded-forge border border-forgeGray-200/40 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h1 className="text-2xl font-black text-forgeGray-900 font-sans">
              Future Enterprise Enhancements
            </h1>
          </div>
          <p className="text-xs font-semibold text-forgeGray-450 mt-1 uppercase tracking-wider">
            Scaffolded placeholder configurations ready for Phase 2 API backend wiring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {futureSpecs.map((spec, idx) => (
          <Card key={idx} variant="default" className="border border-forgeGray-100 flex flex-col justify-between">
            <div className="space-y-3 text-xs font-semibold">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-forgeGray-50 rounded-xl w-fit">
                  {spec.icon}
                </div>
                <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                  spec.status === 'ready_for_api' ? 'bg-emerald-100 text-emerald-700' :
                  spec.status === 'scaffolded' ? 'bg-blue-100 text-blue-700' : 'bg-forgeGray-200 text-forgeGray-750'
                }`}>
                  {spec.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="font-extrabold text-base text-forgeGray-950 mt-2">{spec.title}</h3>
              <p className="text-forgeGray-550 leading-relaxed font-medium">
                {spec.description}
              </p>

              <div className="border-t border-forgeGray-100 pt-3">
                <p className="text-[9px] text-forgeGray-400 uppercase font-bold mb-1.5">Scaffolded Integration Specs</p>
                <div className="flex flex-wrap gap-1.5">
                  {spec.specs.map((item, iIdx) => (
                    <span key={iIdx} className="px-2.5 py-1 bg-forgeGray-50 rounded-lg text-[9px] text-forgeGray-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
};

export default FutureFeaturesView;
