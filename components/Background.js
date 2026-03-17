'use client';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute w-[800px] h-[800px] rounded-full opacity-[0.07] blur-[120px] animate-drift1"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', top: '-20%', left: '10%' }} />
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[100px] animate-drift2"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', top: '40%', right: '-10%' }} />
      <div className="absolute w-[700px] h-[700px] rounded-full opacity-[0.04] blur-[110px] animate-drift3"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', bottom: '-10%', left: '30%' }} />
      
      {/* Ken Burns subtle texture layer */}
      <div className="absolute inset-0 opacity-[0.015] animate-kenburns"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '400px 400px' }} />
      
      <style jsx>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(80px, -60px) scale(1.1); }
          50% { transform: translate(-40px, 80px) scale(0.95); }
          75% { transform: translate(60px, 40px) scale(1.05); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-70px, 50px) scale(1.08); }
          66% { transform: translate(50px, -70px) scale(0.92); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -40px) scale(1.12); }
        }
        @keyframes kenburns {
          0% { transform: scale(1) translate(0, 0); }
          25% { transform: scale(1.05) translate(-1%, 1%); }
          50% { transform: scale(1.1) translate(1%, -1%); }
          75% { transform: scale(1.03) translate(-0.5%, -0.5%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        .animate-drift1 { animation: drift1 25s ease-in-out infinite; }
        .animate-drift2 { animation: drift2 30s ease-in-out infinite; }
        .animate-drift3 { animation: drift3 20s ease-in-out infinite; }
        .animate-kenburns { animation: kenburns 40s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
